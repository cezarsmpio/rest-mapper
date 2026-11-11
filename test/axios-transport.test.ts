import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResolvedRequestConfig } from '../src/types.js';
import {
  createAxiosMapper,
  createMapper,
  FetchTransport,
} from '../src/index.js';
import { AxiosTransport } from '../src/transports/axios.js';
import { createConfig, createResponse } from './helpers.js';

const axiosMock = vi.hoisted(() => ({
  create: vi.fn(),
  request: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    create: axiosMock.create,
  },
}));

beforeEach(() => {
  axiosMock.create.mockReset();
  axiosMock.request.mockReset();
  axiosMock.create.mockReturnValue({ request: axiosMock.request });
  axiosMock.request.mockResolvedValue(createResponse({ id: 1 }));
});

describe('axios transport', () => {
  it('creates an instance with the configured host and forwards the request', async () => {
    const transport = new AxiosTransport('https://api.example.com');
    const config = createConfig({
      url: '/users/1',
      params: { page: 2 },
      headers: { accept: 'application/json' },
    });

    const response = await transport.request(config);

    expect(axiosMock.create).toHaveBeenCalledWith({
      baseURL: 'https://api.example.com',
    });
    expect(axiosMock.request).toHaveBeenCalledWith(config);
    expect(response).toEqual(createResponse({ id: 1 }));
  });

  it('reuses the axios instance across requests', async () => {
    const transport = new AxiosTransport('https://api.example.com');

    await transport.request(createConfig());
    await transport.request(createConfig());

    expect(axiosMock.create).toHaveBeenCalledTimes(1);
    expect(axiosMock.request).toHaveBeenCalledTimes(2);
  });

  it('returns axios responses without reshaping them', async () => {
    const axiosResponse = {
      data: 'raw',
      status: 201,
      statusText: 'Created',
      headers: { location: '/users/1' },
      config: { url: '/users', method: 'post' },
      request: { id: 'request' },
    };
    axiosMock.request.mockResolvedValue(axiosResponse);

    const response = await new AxiosTransport('').request(createConfig());

    expect(response).toBe(axiosResponse);
  });

  it('createAxiosMapper presets the axios adapter', async () => {
    const api = createAxiosMapper({
      host: 'https://api.example.com',
      resources: {
        Health: { get: { url: '/health' } },
      },
    });

    await api.Health.get();

    expect(axiosMock.create).toHaveBeenCalledWith({
      baseURL: 'https://api.example.com',
    });
    expect(axiosMock.request).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/health', method: 'get' }),
    );
  });

  it('does not load axios when the fetch adapter is selected', async () => {
    const fetchMock = vi.fn(async () => new Response('ok'));
    vi.stubGlobal('fetch', fetchMock);

    const api = createMapper({
      adapter: FetchTransport,
      host: 'https://api.example.com',
      resources: {
        Health: { get: { url: '/health' } },
      },
    });

    await api.Health.get();

    expect(axiosMock.create).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('passes the resolved config to axios', async () => {
    const config: ResolvedRequestConfig = createConfig({
      method: 'post',
      data: { name: 'Ada' },
      timeout: 5_000,
      params: { page: 1 },
    });

    await new AxiosTransport('').request(config);

    expect(axiosMock.request).toHaveBeenCalledWith(config);
  });
});
