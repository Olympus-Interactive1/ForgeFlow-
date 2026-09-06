import { describe, expect, it } from 'vitest';
import { extractTextContent } from '../src/core/response.js';

describe('extractTextContent', () => {
  it('returns plain string content', () => {
    expect(extractTextContent('hello')).toBe('hello');
  });

  it('normalizes multimodal text parts', () => {
    expect(extractTextContent([{ type: 'text', text: 'hello ' }, { type: 'text', text: 'world' }])).toBe('hello world');
  });

  it('does not treat reasoning content as final content', () => {
    expect(extractTextContent(null)).toBeNull();
    expect(extractTextContent({ reasoning_content: 'internal reasoning' })).toBeNull();
  });
});
