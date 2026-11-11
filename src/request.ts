import { deepMerge, isPlainObject } from './merge.js';
import type {
  MapperHeaders,
  Params,
  RequestOptions,
  ResolvedRequestConfig,
  ResourceDefinition,
} from './types.js';
import { resolveUrl } from './url.js';

function normalizeHeaders(headers: unknown): MapperHeaders {
  if (!headers) return {};

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  const serializable = headers as { toJSON?: () => unknown };
  const value =
    typeof serializable.toJSON === 'function'
      ? serializable.toJSON()
      : headers;

  if (!isPlainObject(value)) return {};

  const normalized: MapperHeaders = {};

  for (const [key, headerValue] of Object.entries(value)) {
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

export function resolveRequest(
  resource: ResourceDefinition,
  callOptions: RequestOptions | undefined,
  defaults: RequestOptions,
): ResolvedRequestConfig {
  const merged = deepMerge<Record<string, unknown>>(
    defaults as unknown as Record<string, unknown>,
    resource as unknown as Record<string, unknown>,
    (callOptions ?? {}) as Record<string, unknown>,
  );

  if (merged.supplant !== undefined) {
    throw new TypeError(
      'request options.supplant is no longer supported; use request options.params instead.',
    );
  }

  assertParams(merged.params, 'params');
  assertParams(merged.query, 'query');

  const { url, params } = resolveUrl(
    resource.url,
    (merged.params ?? {}) as Params,
    (merged.query ?? {}) as Params,
  );

  const method =
    typeof merged.method === 'string' ? merged.method.toLowerCase() : 'get';
  const headers = normalizeHeaders(merged.headers);

  delete merged.params;
  delete merged.query;
  delete merged.headers;
  delete merged.url;
  delete merged.method;

  return {
    ...merged,
    url,
    method,
    params,
    headers,
  } as ResolvedRequestConfig;
}
