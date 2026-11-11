import { afterEach, describe, expect, it, vi } from 'vitest';
import { RestMapperError } from '../src/errors.js';
import { FetchTransport } from '../src/transports/fetch.js';
import { createConfig, jsonResponse, stubFetch } from './helpers.js';

const transport = new FetchTransport('https://api.example.com');

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetch response parsing', () => {
  it('parses plain text responses', async () => {
    stubFetch(
      async () =>
        new Response('hello', {
          headers: { 'content-type': 'text/plain' },
        }),
    );

    const response = await transport.request(createConfig());

    expect(response.data).toBe('hello');
  });

  it('parses text responses without a content type', async () => {
    stubFetch(
      async () => new Response(new Uint8Array([104, 101, 108, 108, 111])),
    );

    const response = await transport.request(createConfig());

    expect(response.data).toBe('hello');
  });

  it('parses JSON-looking text without a JSON content type', async () => {
    stubFetch(
      async () =>
        new Response('  {"id":1}', {
          headers: { 'content-type': 'text/plain' },
        }),
    );

    const response = await transport.request(createConfig());

    expect(response.data).toEqual({ id: 1 });
  });

  it('falls back to text for invalid JSON', async () => {
    stubFetch(
      async () =>
        new Response('{invalid', {
          headers: { 'content-type': 'application/json' },
        }),
    );

    const response = await transport.request(createConfig());

    expect(response.data).toBe('{invalid');
  });

  it('honors responseType json and empty bodies', async () => {
    stubFetch(
      async () =>
        new Response('42', {
          headers: { 'content-type': 'text/plain' },
        }),
    );

    const parsed = await transport.request(
      createConfig({ responseType: 'json' }),
    );
    expect(parsed.data).toBe(42);

    stubFetch(async () => new Response(''));
    const empty = await transport.request(createConfig());
    expect(empty.data).toBe('');
  });

  it.each([204, 205])('returns an empty body for status %i', async (status) => {
    stubFetch(
      async () =>
        new Response(null, {
          status,
          headers: { 'content-type': 'application/json' },
        }),
    );

    const response = await transport.request(createConfig());

    expect(response.data).toBe('');
  });

  it('returns an empty body for HEAD responses', async () => {
    stubFetch(
      async () =>
        new Response('ignored', {
          headers: { 'content-type': 'application/json' },
        }),
    );

    const response = await transport.request(
      createConfig({ method: 'head' }),
    );

    expect(response.data).toBe('');
  });

  it('supports arraybuffer responses', async () => {
    stubFetch(async () => new Response(new Uint8Array([1, 2])));

    const response = await transport.request(
      createConfig({ responseType: 'arraybuffer' }),
    );

    expect(response.data).toBeInstanceOf(ArrayBuffer);
  });

  it('supports blob responses', async () => {
    stubFetch(async () => new Response('blob body'));

    const response = await transport.request(
      createConfig({ responseType: 'blob' }),
    );

    expect(response.data).toBeInstanceOf(Blob);
  });

  it('supports stream responses', async () => {
    stubFetch(async () => new Response('stream body'));

    const response = await transport.request(
      createConfig({ responseType: 'stream' }),
    );

    expect(response.data).toBeInstanceOf(ReadableStream);
  });

  it('rejects non-2xx responses with status and response data', async () => {
    stubFetch(async () =>
      jsonResponse(
        { message: 'missing' },
        { status: 404, statusText: 'Not Found' },
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
    stubFetch(
      async () =>
        new Response('not found', {
          status: 404,
          headers: { 'content-type': 'text/plain' },
        }),
    );

    await expect(
      transport.request(
        createConfig({ validateStatus: (status) => status === 404 }),
      ),
    ).resolves.toMatchObject({ status: 404, data: 'not found' });

    stubFetch(async () => new Response('ok'));

    await expect(
      transport.request(createConfig({ validateStatus: () => false })),
    ).rejects.toMatchObject({ status: 200 });
  });
});
