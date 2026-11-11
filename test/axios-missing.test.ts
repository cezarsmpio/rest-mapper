import { describe, expect, it, vi } from 'vitest';
import { AxiosTransport } from '../src/transports/axios.js';
import { createConfig } from './helpers.js';

vi.mock('axios', () => {
  throw new Error('axios is not installed');
});

describe('axios transport without axios installed', () => {
  it('rejects with an actionable installation error', async () => {
    const error = await new AxiosTransport('https://api.example.com')
      .request(createConfig())
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      name: 'RestMapperError',
      message:
        'The axios adapter requires the optional peer dependency "axios". Install it with: npm install axios',
    });
  });
});
