export function extractTextContent(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return null;

  const parts: string[] = [];
  for (const part of value) {
    if (typeof part === 'string') {
      parts.push(part);
      continue;
    }
    if (!part || typeof part !== 'object') continue;
    const record = part as Record<string, unknown>;
    if (typeof record.text === 'string') parts.push(record.text);
  }

  return parts.length ? parts.join('') : null;
}
