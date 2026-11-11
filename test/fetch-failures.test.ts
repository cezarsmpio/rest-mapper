import { afterEach, describe, expect, it, vi } from 'vitest';
import { RestMapperError } from '../src/errors.js';
import { FetchTransport } from '../src/transports/fetch.js';
import { createConfig, flushPromises, stubFetch } from './helpers.js';

const transport = new FetchTransport('https://api.example.com');

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('fetch failures', () => {
  it('requires a global fetch implementation', async () => {
    vi.stubGlobal('fetch', undefined);

    await expect(transport.request(createConfig())).rejects.toThrow(
      'The fetch adapter requires a global fetch implementation.',
    );
  });

  it('normalizes network failures', async () => {
    const cause = new Error('connection refused');
    stubFetch(async () => {
      throw cause;
    });

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

  it('normalizes body-read failures', async () => {
    const cause = new Error('body failed');
    stubFetch(
      async () =>
        ({
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          text: async () => {
            throw cause;
          },
        }) as unknown as Response,
    );

    const error = await transport
      .request(createConfig())
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(RestMapperError);
    expect(error).toMatchObject({ message: 'body failed' });
    expect((error as Error).cause).toBe(cause);
  });

  it('uses a generic message for non-Error network failures', async () => {
    stubFetch(async () => {
      throw 'offline';
    });

    await expect(transport.request(createConfig())).rejects.toThrow(
      'Network request failed',
    );
  });

  it('honors an already-aborted signal', async () => {
    const fetchMock = stubFetch();
    const controller = new AbortController();
    controller.abort(new Error('cancelled'));

    await transport.request(createConfig({ signal: controller.signal }));

    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });

  it('aborts when a caller signal fires', async () => {
    const controller = new AbortController();
    stubFetch(
      async (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(init.signal?.reason);
          });
        }),
    );

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

    stubFetch(
      async (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(init.signal?.reason);
          });
        }),
    );

    const request = transport.request(createConfig({ timeout: 50 }));
    const expectation = expect(request).rejects.toThrow(
      'Request timed out after 50ms',
    );
    await vi.advanceTimersByTimeAsync(50);

    await expectation;
  });

  it('keeps the timeout active while reading the body', async () => {
    vi.useFakeTimers();

    stubFetch(
      async (_url, init) =>
        ({
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          text: () =>
            new Promise<string>((_resolve, reject) => {
              init?.signal?.addEventListener('abort', () => {
                reject(init.signal?.reason);
              });
            }),
        }) as unknown as Response,
    );

    const request = transport.request(createConfig({ timeout: 50 }));
    const expectation = expect(request).rejects.toThrow(
      'Request timed out after 50ms',
    );
    await flushPromises();
    await vi.advanceTimersByTimeAsync(50);

    await expectation;
  });

  it('does not create a signal when timeout is zero', async () => {
    const fetchMock = stubFetch();

    await transport.request(createConfig({ timeout: 0 }));

    expect(fetchMock.mock.calls[0]?.[1]).not.toHaveProperty('signal');
  });
});
