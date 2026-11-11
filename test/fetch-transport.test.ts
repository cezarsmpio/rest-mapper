import { afterEach, describe, expect, it, vi } from 'vitest';
import { RestMapperError } from '../src/errors.js';
import { FetchTransport } from '../src/transports/fetch.js';
import type { RequestOptions } from '../src/types.js';
import {
  createConfig,
  flushPromises,
  jsonResponse,
} from './helpers.js';

const transport = new FetchTransport('https://api.example.com');

const createFetchMock = (
  implementation: typeof fetch = async () => jsonResponse({ ok: true }),
) => vi.fn(implementation);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('fetch transport', () => {
  it('performs a request with the expected URL, method, and headers', async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);

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

  it('requires a global fetch implementation', async () => {
    vi.stubGlobal('fetch', undefined);

    await expect(transport.request(createConfig())).rejects.toThrow(
      'The fetch adapter requires a global fetch implementation.',
    );
  });

  it('serializes object bodies as JSON and sets the content type', async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);

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
    const fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);

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
    const fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);

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
    const fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);

    await transport.request(createConfig({ method: 'post', data: body }));

    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(body);
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual({});
  });

  it('maps withCredentials and explicit credentials', async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);

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
    const fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);

    await transport.request(createConfig());

    expect(fetchMock.mock.calls[0]?.[1]).not.toHaveProperty('credentials');
  });

  it('forwards fetch-specific request options', async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);

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
    const fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);

    await transport.request(
      createConfig({ auth: { username: 'ada', password: 'secret' } }),
    );

    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual({
      authorization: `Basic ${btoa('ada:secret')}`,
    });
  });

  it('supports partial credentials and preserves authorization headers', async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);

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
    const fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);

    await transport.request(createConfig({ auth: {} }));
    await transport.request(createConfig({ auth: { username: undefined } }));

    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual({});
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toEqual({});
  });

  it('parses plain text responses', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock(
        async () =>
          new Response('hello', {
            headers: { 'content-type': 'text/plain' },
          }),
      ),
    );

    const response = await transport.request(createConfig());

    expect(response.data).toBe('hello');
  });

  it('parses text responses without a content type', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock(
        async () =>
          new Response(new Uint8Array([104, 101, 108, 108, 111])),
      ),
    );

    const response = await transport.request(createConfig());

    expect(response.data).toBe('hello');
  });

  it('parses JSON-looking text without a JSON content type', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock(
        async () =>
          new Response('  {"id":1}', {
            headers: { 'content-type': 'text/plain' },
          }),
      ),
    );

    const response = await transport.request(createConfig());

    expect(response.data).toEqual({ id: 1 });
  });

  it('falls back to text for invalid JSON', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock(
        async () =>
          new Response('{invalid', {
            headers: { 'content-type': 'application/json' },
          }),
      ),
    );

    const response = await transport.request(createConfig());

    expect(response.data).toBe('{invalid');
  });

  it('honors responseType json and empty bodies', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock(
        async () =>
          new Response('42', {
            headers: { 'content-type': 'text/plain' },
          }),
      ),
    );

    const parsed = await transport.request(
      createConfig({ responseType: 'json' }),
    );
    expect(parsed.data).toBe(42);

    vi.stubGlobal(
      'fetch',
      createFetchMock(async () => new Response('')),
    );
    const empty = await transport.request(createConfig());
    expect(empty.data).toBe('');
  });

  it.each([204, 205])('returns an empty body for status %i', async (status) => {
    vi.stubGlobal(
      'fetch',
      createFetchMock(
        async () =>
          new Response(null, {
            status,
            headers: { 'content-type': 'application/json' },
          }),
      ),
    );

    const response = await transport.request(createConfig());

    expect(response.data).toBe('');
  });

  it('returns an empty body for HEAD responses', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock(
        async () =>
          new Response('ignored', {
            headers: { 'content-type': 'application/json' },
          }),
      ),
    );

    const response = await transport.request(
      createConfig({ method: 'head' }),
    );

    expect(response.data).toBe('');
  });

  it('supports arraybuffer responses', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock(async () => new Response(new Uint8Array([1, 2]))),
    );

    const response = await transport.request(
      createConfig({ responseType: 'arraybuffer' }),
    );

    expect(response.data).toBeInstanceOf(ArrayBuffer);
  });

  it('supports blob responses', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock(async () => new Response('blob body')),
    );

    const response = await transport.request(
      createConfig({ responseType: 'blob' }),
    );

    expect(response.data).toBeInstanceOf(Blob);
  });

  it('supports stream responses', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock(async () => new Response('stream body')),
    );

    const response = await transport.request(
      createConfig({ responseType: 'stream' }),
    );

    expect(response.data).toBeInstanceOf(ReadableStream);
  });

  it('rejects non-2xx responses with status and response data', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock(async () =>
        jsonResponse({ message: 'missing' }, { status: 404, statusText: 'Not Found' }),
      ),
    );

    const error = await transport
      .request(createConfig())
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(RestMapperError);
    expect(error).toMatchObject({
      message: 'Request failed with status code 404',
      status: 404,
      response: {
        data: { message: 'missing' },
        status: 404,
        statusText: 'Not Found',
      },
    });
  });

  it('supports custom validateStatus handlers', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock(
        async () =>
          new Response('not found', {
            status: 404,
            headers: { 'content-type': 'text/plain' },
          }),
      ),
    );

    await expect(
      transport.request(
        createConfig({ validateStatus: (status) => status === 404 }),
      ),
    ).resolves.toMatchObject({ status: 404, data: 'not found' });

    vi.stubGlobal(
      'fetch',
      createFetchMock(async () => new Response('ok')),
    );

    await expect(
      transport.request(createConfig({ validateStatus: () => false })),
    ).rejects.toMatchObject({ status: 200 });
  });

  it('normalizes network failures', async () => {
    const cause = new Error('connection refused');
    vi.stubGlobal(
      'fetch',
      createFetchMock(async () => {
        throw cause;
      }),
    );

    const error = await transport
      .request(createConfig())
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(RestMapperError);
    expect(error).toMatchObject({
      message: 'connection refused',
      status: undefined,
      response: undefined,
    });
    expect((error as Error).cause).toBe(cause);
  });

  it('uses a generic message for non-Error network failures', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock(async () => {
        throw 'offline';
      }),
    );

    await expect(transport.request(createConfig())).rejects.toThrow(
      'Network request failed',
    );
  });

  it('honors an already-aborted signal', async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);

    const controller = new AbortController();
    controller.abort(new Error('cancelled'));

    await transport.request(createConfig({ signal: controller.signal }));

    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });

  it('aborts when a caller signal fires', async () => {
    const controller = new AbortController();
    const fetchMock = createFetchMock(
      async (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(init.signal?.reason);
          });
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const request = transport.request(
      createConfig({ signal: controller.signal }),
    );
    const expectation = expect(request).rejects.toThrow('cancelled');
    await flushPromises();
    controller.abort(new Error('cancelled'));

    await expectation;
  });

  it('aborts requests after the configured timeout', async () => {
    vi.useFakeTimers();

    const fetchMock = createFetchMock(
      async (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(init.signal?.reason);
          });
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const request = transport.request(createConfig({ timeout: 50 }));
    const expectation = expect(request).rejects.toThrow(
      'Request timed out after 50ms',
    );
    await vi.advanceTimersByTimeAsync(50);

    await expectation;
  });

  it('does not create a signal when timeout is zero', async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal('fetch', fetchMock);

    await transport.request(createConfig({ timeout: 0 }));

    expect(fetchMock.mock.calls[0]?.[1]).not.toHaveProperty('signal');
  });
});
