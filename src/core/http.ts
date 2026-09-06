export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  retryBaseMs?: number;
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export async function requestJson<T>(url: string, init: RequestOptions = {}): Promise<T> {
  const { timeoutMs = 60_000, retries = 2, retryBaseMs = 500, ...requestInit } = init;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...requestInit,
        signal: controller.signal,
        headers: { Accept: 'application/json', ...(requestInit.headers ?? {}) }
      });
      const text = await response.text();
      let body: unknown;
      try { body = text ? JSON.parse(text) : undefined; } catch { body = text; }

      if (response.ok) return body as T;
      const error = new Error(`HTTP ${response.status} from ${url}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
      if (!RETRYABLE_STATUS.has(response.status) || attempt >= retries) throw error;
      lastError = error;

      const retryAfter = Number(response.headers.get('retry-after'));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 30_000)
        : Math.min(retryBaseMs * 2 ** attempt, 10_000);
      await new Promise(resolve => setTimeout(resolve, delay));
    } catch (error) {
      lastError = error;
      if (attempt >= retries) throw error;
      const delay = Math.min(retryBaseMs * 2 ** attempt, 10_000);
      await new Promise(resolve => setTimeout(resolve, delay));
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
