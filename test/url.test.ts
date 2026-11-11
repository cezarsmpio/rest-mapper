import { describe, expect, it } from 'vitest';
import {
  buildQueryString,
  buildRequestUrl,
  combineUrls,
  interpolatePath,
  isAbsoluteUrl,
} from '../src/url.js';

describe('URL utilities', () => {
  it('detects absolute URLs', () => {
    expect(isAbsoluteUrl('https://example.com/users')).toBe(true);
    expect(isAbsoluteUrl('//cdn.example.com/users')).toBe(true);
    expect(isAbsoluteUrl('/users')).toBe(false);
    expect(isAbsoluteUrl('users')).toBe(false);
  });

  it('combines base and relative URLs', () => {
    expect(combineUrls('https://api.example.com/', '/users')).toBe(
      'https://api.example.com/users',
    );
    expect(combineUrls('', '/users')).toBe('/users');
    expect(combineUrls('https://api.example.com', '')).toBe(
      'https://api.example.com',
    );
  });

  it('interpolates scalar params and ignores unmatched keys', () => {
    const url = interpolatePath('/users/{id}/posts/{published}', {
      id: 42,
      published: true,
      page: 2,
    });

    expect(url).toBe('/users/42/posts/true');
  });

  it('encodes path parameters', () => {
    expect(interpolatePath('/files/{name}', { name: 'a/b c' })).toBe(
      '/files/a%2Fb%20c',
    );
  });

  it('leaves missing, null, and non-scalar placeholders untouched', () => {
    const url = interpolatePath('/users/{id}/{other}/{missing}', {
      id: { nested: true },
      other: null,
    });

    expect(url).toBe('/users/{id}/{other}/{missing}');
  });

  it('supports string interpolation', () => {
    expect(interpolatePath('/users/{id}', { id: 'abc' })).toBe('/users/abc');
  });

  it('builds query strings for all supported value types', () => {
    const query = buildQueryString({
      text: 'hello world',
      number: 2,
      boolean: false,
      date: new Date('2026-01-02T03:04:05.000Z'),
      list: ['a', 'b'],
      empty: [],
      nested: { one: 1, two: { three: true } },
      skippedNull: null,
      skippedUndefined: undefined,
    });

    expect(query).toBe(
      'text=hello+world&number=2&boolean=false&date=2026-01-02T03%3A04%3A05.000Z&list%5B%5D=a&list%5B%5D=b&nested%5Bone%5D=1&nested%5Btwo%5D%5Bthree%5D=true',
    );
  });

  it('returns an empty query string for no parameters', () => {
    expect(buildQueryString()).toBe('');
    expect(buildQueryString({})).toBe('');
  });

  it('builds request URLs with relative and absolute paths', () => {
    expect(
      buildRequestUrl('https://api.example.com', '/users', { page: 2 }),
    ).toBe('https://api.example.com/users?page=2');
    expect(
      buildRequestUrl('https://api.example.com', '/users?active=true', {
        page: 2,
      }),
    ).toBe('https://api.example.com/users?active=true&page=2');
    expect(
      buildRequestUrl('https://ignored.example.com', 'https://other.example.com/users'),
    ).toBe('https://other.example.com/users');
    expect(buildRequestUrl('', '/users')).toBe('/users');
  });
});
