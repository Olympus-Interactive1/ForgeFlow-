export async function requestJson<T>(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const { timeoutMs = 60_000, ...requestInit } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...requestInit, signal: controller.signal, headers: { Accept: 'application/json', ...(requestInit.headers ?? {}) } });
    const text = await response.text();
    let body: unknown;
    try { body = text ? JSON.parse(text) : undefined; } catch { body = text; }
    if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
    return body as T;
  } finally { clearTimeout(timer); }
}
