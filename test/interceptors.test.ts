import { describe, expect, it, vi } from 'vitest';
import {
  applyRequestInterceptors,
  applyResponseInterceptors,
  handleResponseError,
} from '../src/interceptors.js';
import { createConfig, createResponse } from './helpers.js';

describe('interceptors', () => {
  it('returns the request config untouched when no interceptor exists', async () => {
    const config = createConfig();

    await expect(applyRequestInterceptors(config, undefined)).resolves.toBe(
      config,
    );
    await expect(applyRequestInterceptors(config, false)).resolves.toBe(config);
    await expect(
      applyRequestInterceptors(config, { request: {} }),
    ).resolves.toBe(config);
  });

  it('applies request interceptors and supports replacement configs', async () => {
    const config = createConfig();
    const replacement = createConfig({ headers: { authorization: 'token' } });

    await expect(
      applyRequestInterceptors(config, {
        request: { before: () => replacement },
      }),
    ).resolves.toBe(replacement);
  });

  it('keeps the config when a request interceptor returns nothing', async () => {
    const config = createConfig();
    const before = vi.fn();

    await expect(
      applyRequestInterceptors(config, { request: { before } }),
    ).resolves.toBe(config);
    expect(before).toHaveBeenCalledWith(config);
  });

  it('routes request interceptor errors to the request error handler', async () => {
    const error = new Error('before failed');
    const handler = vi.fn();

    await expect(
      applyRequestInterceptors(createConfig(), {
        request: {
          before: () => {
            throw error;
          },
          error: handler,
        },
      }),
    ).rejects.toBe(error);
    expect(handler).toHaveBeenCalledWith(error);
  });

  it('propagates request interceptor errors without an error handler', async () => {
    const error = new Error('before failed');

    await expect(
      applyRequestInterceptors(createConfig(), {
        request: {
          before: () => {
            throw error;
          },
        },
      }),
    ).rejects.toBe(error);
  });

  it('returns the response untouched without a success handler', async () => {
    const response = createResponse({ id: 1 });

    await expect(
      applyResponseInterceptors(response, undefined),
    ).resolves.toBe(response);
    await expect(applyResponseInterceptors(response, false)).resolves.toBe(
      response,
    );
    await expect(
      applyResponseInterceptors(response, { response: {} }),
    ).resolves.toBe(response);
  });

  it('replaces or keeps responses from success handlers', async () => {
    const response = createResponse({ id: 1 });
    const replacement = createResponse({ id: 2 });

    await expect(
      applyResponseInterceptors(response, {
        response: { success: () => replacement },
      }),
    ).resolves.toBe(replacement);
    await expect(
      applyResponseInterceptors(response, {
        response: { success: () => undefined },
      }),
    ).resolves.toBe(response);
  });

  it('routes response success errors to the response error handler', async () => {
    const error = new Error('success failed');
    const handler = vi.fn();

    await expect(
      applyResponseInterceptors(createResponse({}), {
        response: {
          success: () => {
            throw error;
          },
          error: handler,
        },
      }),
    ).rejects.toBe(error);
    expect(handler).toHaveBeenCalledWith(error);
  });

  it('propagates response success errors without an error handler', async () => {
    const error = new Error('success failed');

    await expect(
      applyResponseInterceptors(createResponse({}), {
        response: {
          success: () => {
            throw error;
          },
        },
      }),
    ).rejects.toBe(error);
  });

  it('handles transport errors and rethrows the original error', async () => {
    const error = new Error('transport failed');
    const handler = vi.fn();

    await expect(
      handleResponseError(error, { response: { error: handler } }),
    ).rejects.toBe(error);
    expect(handler).toHaveBeenCalledWith(error);
  });

  it('rethrows without a response error handler', async () => {
    const error = new Error('transport failed');

    await expect(handleResponseError(error, undefined)).rejects.toBe(error);
    await expect(handleResponseError(error, false)).rejects.toBe(error);
    await expect(
      handleResponseError(error, { response: {} }),
    ).rejects.toBe(error);
  });

  it('propagates errors thrown by the response error handler', async () => {
    const original = new Error('transport failed');
    const replacement = new Error('handler failed');

    await expect(
      handleResponseError(original, {
        response: {
          error: () => {
            throw replacement;
          },
        },
      }),
    ).rejects.toBe(replacement);
  });
});
