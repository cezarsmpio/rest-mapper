import { describe, expect, it, vi } from 'vitest';
import { UndiciTransport } from '../src/index.js';
import { createConfig } from './helpers.js';

vi.mock('undici', () => {
  throw new Error('undici is not installed');
});

describe('undici transport without undici installed', () => {
  it('rejects with an actionable installation error', async () => {
    const error = await new UndiciTransport('https://api.example.com')
      .request(createConfig())
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      name: 'RestMapperError',
      message:
        'The undici adapter requires the optional peer dependency "undici". Install it with: npm install undici',
    });
  });
});
