export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  retryBaseMs?: number;
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

async function fetchWithRetry(url: string, init: RequestInit, timeoutMs: number, retries: number, retryBaseMs: number): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (response.ok) return response;
      const text = await response.text();
      const error = new Error(`HTTP ${response.status} from ${url}: ${text}`);
      if (!RETRYABLE_STATUS.has(response.status) || attempt >= retries) throw error;
      lastError = error;
      const retryAfter = Number(response.headers.get('retry-after'));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 30_000)
        : Math.min(retryBaseMs * 2 ** attempt, 10_000);
      await new Promise(resolve => setTimeout(resolve, delay));
    } catch (error) {
      lastError = error;
      if (error instanceof Error && /^HTTP \d+ from /.test(error.message)) {
        const status = Number(error.message.match(/^HTTP (\d+)/)?.[1]);
        if (!RETRYABLE_STATUS.has(status) || attempt >= retries) throw error;
      } else if (attempt >= retries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, Math.min(retryBaseMs * 2 ** attempt, 10_000)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function requestJson<T>(url: string, init: RequestOptions = {}): Promise<T> {
  const { timeoutMs = 60_000, retries = 2, retryBaseMs = 500, ...requestInit } = init;
  const response = await fetchWithRetry(url, {
    ...requestInit,
    headers: { Accept: 'application/json', ...(requestInit.headers ?? {}) }
  }, timeoutMs, retries, retryBaseMs);
  const text = await response.text();
  let body: unknown;
  try { body = text ? JSON.parse(text) : undefined; } catch { body = text; }
  return body as T;
}

export async function requestBytes(url: string, init: RequestOptions = {}): Promise<{ bytes: Uint8Array; contentType: string | null }> {
  const { timeoutMs = 60_000, retries = 2, retryBaseMs = 500, ...requestInit } = init;
  const response = await fetchWithRetry(url, {
    ...requestInit,
    headers: { Accept: 'application/octet-stream, audio/wav, video/mp4, application/json', ...(requestInit.headers ?? {}) }
  }, timeoutMs, retries, retryBaseMs);
  return { bytes: new Uint8Array(await response.arrayBuffer()), contentType: response.headers.get('content-type') };
}
