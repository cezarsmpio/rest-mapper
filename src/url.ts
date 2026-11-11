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

/**
 * Interpolates `{name}` placeholders using scalar values from `params`.
 * Keys that do not match a placeholder are ignored.
 */
export function interpolatePath(
  template: string,
  params: Params = {},
): string {
  return template.replace(/{([^{}]+)}/g, (placeholder, key: string) => {
    const value = params[key];
    return isInterpolatable(value)
      ? encodeURIComponent(String(value))
      : placeholder;
  });
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
