import type {
  MapperResponse,
  ResolvedRequestConfig,
} from '../src/types.js';

export function createConfig(
  overrides: Partial<ResolvedRequestConfig> = {},
): ResolvedRequestConfig {
  return {
    url: '/users',
    method: 'get',
    params: {},
    headers: {},
    ...overrides,
  };
}

export function createResponse<T>(
  data: T,
  overrides: Partial<MapperResponse<T>> = {},
): MapperResponse<T> {
  const config = overrides.config ?? createConfig();

  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    config,
    ...overrides,
  };
}

export function createFetchResponse(
  body: BodyInit | null,
  init: ResponseInit = {},
): Response {
  return new Response(body, init);
}

export function jsonResponse(
  value: unknown,
  init: ResponseInit = {},
): Response {
  const status = init.status ?? 200;

  return new Response(JSON.stringify(value), {
    ...init,
    status,
    statusText: init.statusText ?? (status === 200 ? 'OK' : ''),
    headers: {
      'content-type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

export const flushPromises = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

export const neverResolves = <T>(): Promise<T> =>
  new Promise<T>(() => undefined);
