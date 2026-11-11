import { isPlainObject } from './merge.js';
import type { ParamValue, Params } from './types.js';

export function isAbsoluteUrl(url: string): boolean {
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
}

export function combineUrls(baseUrl: string, relativeUrl: string): string {
  if (!baseUrl) return relativeUrl;
  if (!relativeUrl) return baseUrl;

  return `${baseUrl.replace(/\/+$/, '')}/${relativeUrl.replace(/^\/+/, '')}`;
}

function isInterpolatable(
  value: ParamValue,
): value is string | number | boolean {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

export interface ResolvedUrl {
  url: string;
  params: Params;
}

/**
 * Interpolates `{name}` placeholders using scalar values from `params`.
 * Unmatched keys remain available as query parameters. An explicit `query`
 * object is merged last and wins on duplicate keys.
 */
export function resolveUrl(
  template: string,
  params: Params = {},
  query: Params = {},
): ResolvedUrl {
  const consumed = new Set<string>();

  const url = template.replace(/{([^{}]+)}/g, (placeholder, key: string) => {
    const value = params[key];

    if (!isInterpolatable(value)) return placeholder;

    consumed.add(key);
    return encodeURIComponent(String(value));
  });

  const remaining: Record<string, ParamValue> = {};
  for (const [key, value] of Object.entries(params)) {
    if (!consumed.has(key)) remaining[key] = value;
  }

  return {
    url,
    params: { ...remaining, ...query },
  };
}

function appendQueryValue(
  search: URLSearchParams,
  key: string,
  value: ParamValue,
): void {
  if (value === null || value === undefined) return;

  if (Array.isArray(value)) {
    for (const item of value) appendQueryValue(search, `${key}[]`, item);
    return;
  }

  if (value instanceof Date) {
    search.append(key, value.toISOString());
    return;
  }

  if (isPlainObject(value)) {
    for (const [childKey, childValue] of Object.entries(value)) {
      appendQueryValue(search, `${key}[${childKey}]`, childValue);
    }
    return;
  }

  search.append(key, String(value));
}

export function buildQueryString(params: Params = {}): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    appendQueryValue(search, key, value);
  }

  return search.toString();
}

export function buildRequestUrl(
  baseUrl: string,
  url: string,
  params: Params = {},
): string {
  const fullUrl = isAbsoluteUrl(url) ? url : combineUrls(baseUrl, url);
  const query = buildQueryString(params);

  if (!query) return fullUrl;

  return `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}${query}`;
}
