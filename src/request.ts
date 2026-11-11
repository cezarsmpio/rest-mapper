import { deepMerge, isPlainObject } from './merge.js';
import type {
  MapperHeaders,
  Params,
  RequestOptions,
  ResolvedRequestConfig,
  ResourceDefinition,
} from './types.js';
import { interpolatePath } from './url.js';

function normalizeHeaders(headers: unknown): MapperHeaders {
  if (!headers) return {};

  const serializable = headers as { toJSON?: () => unknown };
  let value: unknown;

  if (
    isPlainObject(headers) &&
    typeof serializable.toJSON !== 'function'
  ) {
    value = headers;
  } else if (typeof serializable.toJSON === 'function') {
    value = serializable.toJSON();
  } else if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  } else {
    value = headers;
  }

  if (!isPlainObject(value)) return {};

  const normalized: MapperHeaders = {};

  for (const key in value) {
    if (!Object.hasOwn(value, key)) continue;

    const headerValue = value[key];
    if (headerValue === undefined || headerValue === null) continue;

    normalized[key.toLowerCase()] = Array.isArray(headerValue)
      ? headerValue.join(', ')
      : String(headerValue);
  }

  return normalized;
}

function assertParams(
  value: unknown,
  name: 'params' | 'query',
): asserts value is Params {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    throw new TypeError(`request options.${name} must be a plain object.`);
  }
}

function resolveMergedRequest(
  merged: Record<string, unknown>,
  resourceUrl: string,
): ResolvedRequestConfig {
  if (merged.supplant !== undefined) {
    throw new TypeError(
      'request options.supplant is no longer supported; use request options.params instead.',
    );
  }

  assertParams(merged.params, 'params');
  assertParams(merged.query, 'query');

  const url = interpolatePath(
    resourceUrl,
    (merged.params ?? {}) as Params,
  );
  const params = (merged.query ?? {}) as Params;

  const method =
    typeof merged.method === 'string' ? merged.method.toLowerCase() : 'get';
  const headers = normalizeHeaders(merged.headers);
  const {
    params: _params,
    query: _query,
    headers: _headers,
    url: _url,
    method: _method,
    ...rest
  } = merged;

  return {
    ...rest,
    url,
    method,
    params,
    headers,
  } as ResolvedRequestConfig;
}

export function resolveRequest(
  resource: ResourceDefinition,
  callOptions: RequestOptions | undefined,
  defaults: RequestOptions,
): ResolvedRequestConfig {
  return resolveMergedRequest(
    deepMerge<Record<string, unknown>>(
      defaults as unknown as Record<string, unknown>,
      resource as unknown as Record<string, unknown>,
      (callOptions ?? {}) as Record<string, unknown>,
    ),
    resource.url,
  );
}

export function createRequestResolver(
  resource: ResourceDefinition,
  defaults: RequestOptions,
): (callOptions?: RequestOptions) => ResolvedRequestConfig {
  let baseConfig: Record<string, unknown> | undefined;

  // Defaults and resource options are stable; call options vary per request.
  return (callOptions) => {
    baseConfig ??= deepMerge<Record<string, unknown>>(
      defaults as unknown as Record<string, unknown>,
      resource as unknown as Record<string, unknown>,
    );

    return resolveMergedRequest(
      deepMerge<Record<string, unknown>>(
        baseConfig,
        (callOptions ?? {}) as Record<string, unknown>,
      ),
      resource.url,
    );
  };
}
