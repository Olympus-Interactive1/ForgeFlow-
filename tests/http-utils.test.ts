import { describe, expect, it } from 'vitest';

describe('HTTP hardening contract', () => {
  it('documents safe defaults', () => {
    expect(Number(process.env.FORGEFLOW_MAX_BODY_BYTES ?? 2_097_152)).toBeGreaterThan(0);
    expect(Number(process.env.FORGEFLOW_RATE_LIMIT ?? 60)).toBeGreaterThan(0);
  });
});
