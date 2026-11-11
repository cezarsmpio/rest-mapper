import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createMapper,
  RestMapperError,
  type MapperConfig,
  type RequestOptions,
} from '../src/index.js';
import { jsonResponse, stubFetch } from './helpers.js';

function objectWithKey(
  key: string,
  value: unknown,
): Record<string, unknown> {
  const object: Record<string, unknown> = {};
  Object.defineProperty(object, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  });
  return object;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createMapper', () => {
  it('creates an empty mapper without a config', () => {
    expect(createMapper()).toEqual({});
  });

  it('creates all CRUD methods with the expected URLs and methods', async () => {
    const fetchMock = stubFetch();
    const api = createMapper({
      adapter: 'fetch',
      host: 'https://api.example.com',
      cruds: {
        Users: { baseURL: '/users' },
      },
    });

    await api.Users.all();
    await api.Users.get({ params: { id: 1, page: 2 } });
    await api.Users.create({ data: { name: 'Ada' } });
    await api.Users.update({ params: { id: 1 }, data: { name: 'Grace' } });
    await api.Users.delete({ params: { id: 1 } });

    expect(fetchMock.mock.calls.map(([url, init]) => [url, init?.method])).toEqual([
      ['https://api.example.com/users', 'GET'],
      ['https://api.example.com/users/1?page=2', 'GET'],
      ['https://api.example.com/users', 'POST'],
      ['https://api.example.com/users/1', 'PATCH'],
      ['https://api.example.com/users/1', 'DELETE'],
    ]);
  });

  it('merges CRUD defaults and resource methods that share a name', async () => {
    const fetchMock = stubFetch();
    const api = createMapper({
      adapter: 'fetch',
      host: 'https://api.example.com',
      cruds: {
        Users: {
          baseURL: '/users',
          defaults: { headers: { accept: 'application/json' } },
        },
      },
      resources: {
        Users: {
          search: { url: '/users/search', method: 'post' },
        },
      },
    });

    await api.Users.all();
    await api.Users.search({ query: { name: 'Ada' } });

    expect(api.Users.all).toBeTypeOf('function');
    expect(api.Users.search).toBeTypeOf('function');
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual({
      accept: 'application/json',
    });
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'https://api.example.com/users/search?name=Ada',
    );
  });

  it('applies global defaults and lets calls override them', async () => {
    const fetchMock = stubFetch();
    const api = createMapper({
      adapter: 'fetch',
      host: 'https://api.example.com',
      defaults: {
        method: 'post',
        timeout: 1_000,
        headers: { accept: 'application/json', 'x-default': 'yes' },
        query: { category: 'all' },
      },
      resources: {
        User: {
          save: {
            url: '/users/{id}',
            headers: { authorization: 'token' },
          },
        },
      },
    });

    await api.User.save({
      params: { id: 3, page: 2 },
      headers: { 'x-call': 'yes' },
      timeout: 2_000,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/users/3?page=2&category=all',
      expect.objectContaining({
        method: 'POST',
        headers: {
          accept: 'application/json',
          authorization: 'token',
          'x-default': 'yes',
          'x-call': 'yes',
        },
      }),
    );
  });

  it('lets calls override the HTTP method and use absolute URLs', async () => {
    const fetchMock = stubFetch();
    const api = createMapper({
      adapter: 'fetch',
      host: 'https://ignored.example.com',
      resources: {
        Auth: {
          signin: { url: '/access/signin' },
          external: { url: 'https://other.example.com/status' },
        },
      },
    });

    await api.Auth.signin({ method: 'post' });
    await api.Auth.external();

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://ignored.example.com/access/signin',
    );
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST');
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'https://other.example.com/status',
    );
  });

  it('supports method names that shadow object prototype properties', async () => {
    const fetchMock = stubFetch();
    const api = createMapper({
      adapter: 'fetch',
      resources: {
        User: {
          toString: { url: '/users/string' },
        },
      },
    });

    await api.User.toString();

    expect(fetchMock).toHaveBeenCalledWith(
      '/users/string',
      expect.any(Object),
    );
  });

  it('applies request and response interceptors', async () => {
    const fetchMock = stubFetch(async (_url, init) => {
      expect(new Headers(init?.headers).get('x-request')).toBe('yes');
      return jsonResponse({ value: 1 });
    });
    const before = vi.fn((config) => {
      config.headers['x-request'] = 'yes';
    });
    const success = vi.fn((response) => ({
      ...response,
      data: { value: 2 },
    }));

    const api = createMapper({
      adapter: 'fetch',
      resources: { User: { get: { url: '/users' } } },
      intercept: {
        request: { before },
        response: { success },
      },
    });

    const response = await api.User.get();

    expect(response.data).toEqual({ value: 2 });
    expect(before).toHaveBeenCalledOnce();
    expect(success).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('supports async interceptor replacements', async () => {
    stubFetch();
    const api = createMapper({
      adapter: 'fetch',
      resources: { User: { get: { url: '/users' } } },
      intercept: {
        request: {
          before: async (config) => ({
            ...config,
            url: '/replaced',
          }),
        },
        response: {
          success: async (response) => ({
            ...response,
            data: 'replaced',
          }),
        },
      },
    });

    await expect(api.User.get()).resolves.toMatchObject({
      data: 'replaced',
      config: { url: '/replaced' },
    });
  });

  it('routes request interceptor failures without calling the transport', async () => {
    const fetchMock = stubFetch();
    const error = new Error('before failed');
    const errorHandler = vi.fn();
    const api = createMapper({
      adapter: 'fetch',
      resources: { User: { get: { url: '/users' } } },
      intercept: {
        request: {
          before: () => {
            throw error;
          },
          error: errorHandler,
        },
      },
    });

    await expect(api.User.get()).rejects.toBe(error);
    expect(errorHandler).toHaveBeenCalledWith(error);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('routes response success failures to the error interceptor', async () => {
    stubFetch();
    const error = new Error('success failed');
    const errorHandler = vi.fn();
    const api = createMapper({
      adapter: 'fetch',
      resources: { User: { get: { url: '/users' } } },
      intercept: {
        response: {
          success: () => {
            throw error;
          },
          error: errorHandler,
        },
      },
    });

    await expect(api.User.get()).rejects.toBe(error);
    expect(errorHandler).toHaveBeenCalledWith(error);
  });

  it('routes transport failures to the response error interceptor', async () => {
    stubFetch(async () => {
      throw new Error('network down');
    });
    const errorHandler = vi.fn();
    const api = createMapper({
      adapter: 'fetch',
      resources: { User: { get: { url: '/users' } } },
      intercept: {
        response: { error: errorHandler },
      },
    });

    const error = await api.User.get().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(RestMapperError);
    expect(error).toMatchObject({ message: 'network down' });
    expect(errorHandler).toHaveBeenCalledWith(error);
  });

  it('accepts intercept: false', async () => {
    stubFetch();
    const api = createMapper({
      adapter: 'fetch',
      intercept: false,
      resources: { User: { get: { url: '/users' } } },
    });

    await expect(api.User.get()).resolves.toMatchObject({ status: 200 });
  });

  it('rejects the removed supplant option', async () => {
    stubFetch();
    const api = createMapper({
      adapter: 'fetch',
      resources: { User: { get: { url: '/users/{id}' } } },
    });

    await expect(
      api.User.get({ supplant: { id: 1 } } as unknown as RequestOptions),
    ).rejects.toThrow('use request options.params instead');
  });

  it('validates per-call request options', async () => {
    stubFetch();
    const api = createMapper({
      adapter: 'fetch',
      resources: { User: { get: { url: '/users' } } },
    });

    await expect(
      api.User.get({ params: [] } as unknown as RequestOptions),
    ).rejects.toThrow('request options.params must be a plain object');
    await expect(
      api.User.get('invalid' as unknown as RequestOptions),
    ).rejects.toThrow('request options must be a plain object');
  });

  it.each<[string, unknown, string]>([
    ['null config', null, 'config must be a plain object'],
    ['array config', [], 'config must be a plain object'],
    ['non-string host', { host: 1 }, 'config.host must be a string'],
    ['invalid adapter', { adapter: 'xhr' }, "config.adapter must be 'axios' or 'fetch'"],
    ['invalid intercept', { intercept: 'yes' }, 'config.intercept must be a plain object'],
    [
      'invalid request intercept',
      { intercept: { request: 'yes' } },
      'config.intercept.request must be a plain object',
    ],
    [
      'invalid intercept handler',
      { intercept: { request: { before: true } } },
      'config.intercept.request.before must be a function',
    ],
    [
      'invalid defaults',
      { defaults: [] },
      'config.defaults must be a plain object',
    ],
    [
      'invalid defaults params',
      { defaults: { params: [] } },
      'config.defaults.params must be a plain object',
    ],
    [
      'invalid resources',
      { resources: [] },
      'config.resources must be a plain object',
    ],
    [
      'invalid resource group',
      { resources: { User: [] } },
      'config.resources.User must be a plain object',
    ],
    [
      'invalid resource definition',
      { resources: { User: { get: [] } } },
      'config.resources.User.get must be a plain object',
    ],
    [
      'missing resource URL',
      { resources: { User: { get: {} } } },
      'config.resources.User.get.url must be a string',
    ],
    [
      'invalid resource params',
      { resources: { User: { get: { url: '/', params: [] } } } },
      'config.resources.User.get.params must be a plain object',
    ],
    [
      'invalid cruds',
      { cruds: [] },
      'config.cruds must be a plain object',
    ],
    [
      'invalid crud group',
      { cruds: { User: [] } },
      'config.cruds.User must be a plain object',
    ],
    [
      'missing baseURL',
      { cruds: { User: {} } },
      'config.cruds.User.baseURL must be a string',
    ],
    [
      'invalid crud defaults',
      { cruds: { User: { baseURL: '/', defaults: [] } } },
      'config.cruds.User.defaults must be a plain object',
    ],
  ])('rejects %s', (_name, config, message) => {
    expect(() => createMapper(config as MapperConfig)).toThrow(message);
  });

  it('rejects prototype-polluting resource and CRUD names', () => {
    expect(() =>
      createMapper({
        resources: objectWithKey('__proto__', {}) as never,
      }),
    ).toThrow('config.resources.__proto__ must be a safe property name');

    expect(() =>
      createMapper({
        resources: {
          User: objectWithKey('constructor', { url: '/' }) as never,
        },
      }),
    ).toThrow(
      'config.resources.User.constructor must be a safe property name',
    );

    expect(() =>
      createMapper({
        cruds: objectWithKey('prototype', { baseURL: '/' }) as never,
      }),
    ).toThrow('config.cruds.prototype must be a safe property name');
  });
});
