import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createUndiciMapper,
  UndiciTransport,
} from '../src/index.js';
import { createConfig, jsonResponse } from './helpers.js';

const undiciMock = vi.hoisted(() => ({
  fetch: vi.fn(),
}));

vi.mock('undici', () => ({
  fetch: undiciMock.fetch,
}));

beforeEach(() => {
  undiciMock.fetch.mockReset();
  undiciMock.fetch.mockResolvedValue(jsonResponse({ ok: true }));
});

describe('undici transport', () => {
  it('routes requests through undici fetch', async () => {
    const transport = new UndiciTransport('https://api.example.com');

    const response = await transport.request(
      createConfig({
        url: '/users/1',
        params: { page: 2 },
        headers: { accept: 'application/json' },
      }),
    );

    expect(undiciMock.fetch).toHaveBeenCalledWith(
      'https://api.example.com/users/1?page=2',
      expect.objectContaining({
        method: 'GET',
        headers: { accept: 'application/json' },
      }),
    );
    expect(response).toMatchObject({
      data: { ok: true },
      status: 200,
    });
  });

  it('passes a custom undici dispatcher', async () => {
    const dispatcher = { dispatch: vi.fn() };
    const transport = new UndiciTransport('https://api.example.com');

    await transport.request(createConfig({ dispatcher }));

    expect(undiciMock.fetch).toHaveBeenCalledWith(
      'https://api.example.com/users',
      expect.objectContaining({ dispatcher }),
    );
  });

  it('createUndiciMapper presets the undici transport', async () => {
    const api = createUndiciMapper({
      host: 'https://api.example.com',
      resources: {
        Health: { get: { url: '/health' } },
      },
    });

    const response = await api.Health.get();

    expect(undiciMock.fetch).toHaveBeenCalledWith(
      'https://api.example.com/health',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(response.data).toEqual({ ok: true });
  });
});
