import { describe, expect, it } from 'vitest';
import type { RequestOptions, ResourceDefinition } from '../src/types.js';
import { resolveRequest } from '../src/request.js';

describe('request resolution', () => {
  it('applies defaults, resource, and call precedence', () => {
    const defaults: RequestOptions = {
      method: 'get',
      timeout: 1_000,
      headers: { accept: 'application/json', 'x-default': 'one' },
      query: { page: 1 },
    };
    const resource: ResourceDefinition = {
      url: '/users/{id}',
      headers: { authorization: 'token' },
      params: { id: 7 },
    };
    const call: RequestOptions = {
      method: 'POST',
      timeout: 2_000,
      headers: { 'x-default': 'two' },
      query: { sort: 'name' },
      data: { name: 'Ada' },
    };

    const result = resolveRequest(resource, call, defaults);

    expect(result).toMatchObject({
      url: '/users/7',
      method: 'post',
      timeout: 2_000,
      headers: {
        accept: 'application/json',
        authorization: 'token',
        'x-default': 'two',
      },
      params: { page: 1, sort: 'name' },
      data: { name: 'Ada' },
    });
  });

  it('defaults the method to get and normalizes headers', () => {
    const headers = {
      toJSON: () => ({
        'Content-Type': 'application/json',
        'X-List': ['a', 'b'],
        'X-Empty': null,
      }),
    };

    const result = resolveRequest(
      { url: '/users', headers } as unknown as ResourceDefinition,
      undefined,
      {},
    );

    expect(result.method).toBe('get');
    expect(result.headers).toEqual({
      'content-type': 'application/json',
      'x-list': 'a, b',
    });
    expect(result.params).toEqual({});
  });

  it('normalizes native Headers instances', () => {
    const headers = new Headers([
      ['Content-Type', 'application/json'],
      ['X-Request-Id', '123'],
    ]);

    const result = resolveRequest({ url: '/users', headers }, undefined, {});

    expect(result.headers).toEqual({
      'content-type': 'application/json',
      'x-request-id': '123',
    });
  });

  it('ignores non-object header values', () => {
    const result = resolveRequest(
      { url: '/users', headers: 'invalid' } as unknown as ResourceDefinition,
      undefined,
      {},
    );

    expect(result.headers).toEqual({});
  });

  it('ignores inherited enumerable header keys', () => {
    Object.defineProperty(Object.prototype, 'x-inherited', {
      value: 'ignored',
      enumerable: true,
      configurable: true,
      writable: true,
    });

    try {
      const result = resolveRequest(
        { url: '/users', headers: { 'X-Own': 'value' } },
        undefined,
        {},
      );

      expect(result.headers).toEqual({ 'x-own': 'value' });
    } finally {
      delete (Object.prototype as { 'x-inherited'?: string })['x-inherited'];
    }
  });

  it('removes helper properties from the transport config', () => {
    const result = resolveRequest(
      { url: '/users', method: 'delete' },
      { query: { page: 2 } },
      {},
    );

    expect(result).not.toHaveProperty('query');
    expect(result.headers).toEqual({});
    expect(result.params).toEqual({ page: 2 });
  });

  it('does not promote unmatched params to the query string', () => {
    const result = resolveRequest(
      { url: '/users/{id}', params: { id: 1, ignored: 2 } },
      { query: { page: 3 } },
      {},
    );

    expect(result.url).toBe('/users/1');
    expect(result.params).toEqual({ page: 3 });
  });

  it('does not mutate the defaults, resource, or call options', () => {
    const defaults: RequestOptions = { headers: { accept: 'json' } };
    const resource: ResourceDefinition = {
      url: '/users/{id}',
      params: { id: 1 },
    };
    const call: RequestOptions = {
      headers: { authorization: 'token' },
      query: { page: 2 },
    };

    resolveRequest(resource, call, defaults);

    expect(defaults).toEqual({ headers: { accept: 'json' } });
    expect(resource).toEqual({
      url: '/users/{id}',
      params: { id: 1 },
    });
    expect(call).toEqual({
      headers: { authorization: 'token' },
      query: { page: 2 },
    });
  });

  it('rejects the removed supplant option with a migration message', () => {
    expect(() =>
      resolveRequest(
        { url: '/users/{id}' },
        { supplant: { id: 1 } } as unknown as RequestOptions,
        {},
      ),
    ).toThrow('use request options.params instead');
  });

  it('rejects non-object params and query values', () => {
    expect(() =>
      resolveRequest(
        { url: '/users' },
        { params: 'invalid' } as unknown as RequestOptions,
        {},
      ),
    ).toThrow('request options.params must be a plain object');

    expect(() =>
      resolveRequest(
        { url: '/users' },
        { query: 'invalid' } as unknown as RequestOptions,
        {},
      ),
    ).toThrow('request options.query must be a plain object');
  });
});
