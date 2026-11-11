import { afterEach, describe, expect, it, vi } from 'vitest';
import { FetchTransport } from '../src/transports/fetch.js';
import type { RequestOptions } from '../src/types.js';
import { createConfig, stubFetch } from './helpers.js';

const transport = new FetchTransport('https://api.example.com');

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetch request construction', () => {
  it('performs a request with the expected URL, method, and headers', async () => {
    const fetchMock = stubFetch();

    const response = await transport.request(
      createConfig({
        url: '/users/1',
        method: 'get',
        params: { page: 2 },
        headers: { accept: 'application/json' },
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/users/1?page=2',
      expect.objectContaining({
        method: 'GET',
        headers: { accept: 'application/json' },
      }),
    );
    expect(response).toMatchObject({
      data: { ok: true },
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
    });
    expect(response.config.url).toBe('/users/1');
    expect(response.request).toBeInstanceOf(Response);
  });

  it('serializes object bodies as JSON and sets the content type', async () => {
    const fetchMock = stubFetch();

    await transport.request(
      createConfig({ method: 'post', data: { name: 'Ada' } }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/users',
      expect.objectContaining({
        body: '{"name":"Ada"}',
        headers: { 'content-type': 'application/json' },
      }),
    );
  });

  it('preserves an existing content type for JSON bodies', async () => {
    const fetchMock = stubFetch();

    await transport.request(
      createConfig({
        method: 'put',
        data: { name: 'Ada' },
        headers: { 'content-type': 'application/vnd.api+json' },
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/users',
      expect.objectContaining({
        headers: { 'content-type': 'application/vnd.api+json' },
      }),
    );
  });

  it('does not send bodies for GET, HEAD, null, or undefined', async () => {
    const fetchMock = stubFetch();

    await transport.request(createConfig({ method: 'get', data: { a: 1 } }));
    await transport.request(createConfig({ method: 'head', data: { a: 1 } }));
    await transport.request(createConfig({ method: 'post', data: null }));
    await transport.request(createConfig({ method: 'post' }));

    for (const call of fetchMock.mock.calls) {
      expect(call[1]).not.toHaveProperty('body');
    }
  });

  it.each([
    ['string', 'raw body'],
    ['array buffer', new ArrayBuffer(2)],
    ['typed array', new Uint8Array([1, 2])],
    ['blob', new Blob(['body'])],
    ['form data', new FormData()],
    ['url search params', new URLSearchParams({ a: '1' })],
    ['readable stream', new ReadableStream()],
  ])('passes native %s bodies through unchanged', async (_name, body) => {
    const fetchMock = stubFetch();

    await transport.request(createConfig({ method: 'post', data: body }));

    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(body);
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual({});
  });

  it('maps withCredentials and explicit credentials', async () => {
    const fetchMock = stubFetch();

    await transport.request(
      createConfig({ method: 'get', withCredentials: true }),
    );
    await transport.request(
      createConfig({
        method: 'get',
        withCredentials: true,
        credentials: 'omit',
      }),
    );

    expect(fetchMock.mock.calls[0]?.[1]?.credentials).toBe('include');
    expect(fetchMock.mock.calls[1]?.[1]?.credentials).toBe('omit');
  });

  it('omits credentials when not configured', async () => {
    const fetchMock = stubFetch();

    await transport.request(createConfig());

    expect(fetchMock.mock.calls[0]?.[1]).not.toHaveProperty('credentials');
  });

  it('forwards fetch-specific request options', async () => {
    const fetchMock = stubFetch();
    const options: RequestOptions = {
      mode: 'cors',
      cache: 'no-store',
      redirect: 'manual',
    };

    await transport.request(
      createConfig({
        mode: 'cors',
        cache: options.cache ?? 'no-store',
        redirect: 'manual',
      }),
    );

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      mode: 'cors',
      cache: 'no-store',
      redirect: 'manual',
    });
  });

  it('adds HTTP basic authentication when configured', async () => {
    const fetchMock = stubFetch();

    await transport.request(
      createConfig({ auth: { username: 'ada', password: 'secret' } }),
    );

    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual({
      authorization: `Basic ${btoa('ada:secret')}`,
    });
  });

  it('supports partial credentials and preserves authorization headers', async () => {
    const fetchMock = stubFetch();

    await transport.request(createConfig({ auth: { username: 'ada' } }));
    await transport.request(createConfig({ auth: { password: 'secret' } }));
    await transport.request(
      createConfig({
        auth: { username: 'ada' },
        headers: { authorization: 'Bearer token' },
      }),
    );

    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual({
      authorization: `Basic ${btoa('ada:')}`,
    });
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toEqual({
      authorization: `Basic ${btoa(':secret')}`,
    });
    expect(fetchMock.mock.calls[2]?.[1]?.headers).toEqual({
      authorization: 'Bearer token',
    });
  });

  it('does not add basic auth without credentials', async () => {
    const fetchMock = stubFetch();

    await transport.request(createConfig({ auth: {} }));
    await transport.request(createConfig({ auth: { username: undefined } }));

    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual({});
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toEqual({});
  });
});
