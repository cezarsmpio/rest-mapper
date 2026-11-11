import { describe, expect, it } from 'vitest';
import {
  createAxiosMapper,
  createFetchMapper,
  createMapper,
  type MapperResponse,
  type ResolvedRequestConfig,
  type Transport,
} from '../src/index.js';
import { stubFetch } from './helpers.js';

class RecordingTransport implements Transport {
  constructor(readonly host: string) {}

  async request(config: ResolvedRequestConfig): Promise<MapperResponse> {
    return {
      data: {
        host: this.host,
        url: config.url,
        params: config.params,
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  }
}

describe('mapper factories', () => {
  it('accepts a transport constructor as the adapter', async () => {
    const api = createMapper({
      adapter: RecordingTransport,
      host: 'https://custom.example.com',
      resources: {
        Health: { get: { url: '/health/{id}' } },
      },
    });

    const response = await api.Health.get({
      params: { id: 7 },
      query: { page: 2 },
    });

    expect(response.data).toEqual({
      host: 'https://custom.example.com',
      url: '/health/7',
      params: { page: 2 },
    });
  });

  it('createFetchMapper presets the fetch transport', async () => {
    const fetchMock = stubFetch();
    const api = createFetchMapper({
      host: 'https://api.example.com',
      resources: {
        Health: { get: { url: '/health' } },
      },
    });

    const response = await api.Health.get();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/health',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(response.status).toBe(200);
  });

  it('createAxiosMapper presets the axios transport', () => {
    const api = createAxiosMapper({
      resources: {
        Health: { get: { url: '/health' } },
      },
    });

    expect(api.Health.get).toBeTypeOf('function');
  });

  it('creates empty wrappers without config', () => {
    expect(createFetchMapper()).toEqual({});
    expect(createAxiosMapper()).toEqual({});
  });
});
