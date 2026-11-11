import { RestMapperError } from '../errors.js';
import type {
  MapperHeaders,
  MapperResponse,
  ResolvedRequestConfig,
  Transport,
} from '../types.js';
import { buildRequestUrl } from '../url.js';

interface AbortBundle {
  signal: AbortSignal | undefined;
  cleanup: () => void;
}

function createAbortBundle(
  signal: AbortSignal | undefined,
  timeout: number | undefined,
): AbortBundle {
  if (!signal && (!timeout || timeout <= 0)) {
    return { signal: undefined, cleanup: () => undefined };
  }

  const controller = new AbortController();
  const cleanup: Array<() => void> = [];

  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason);
    } else {
      const onAbort = (): void => controller.abort(signal.reason);
      signal.addEventListener('abort', onAbort, { once: true });
      cleanup.push(() => signal.removeEventListener('abort', onAbort));
    }
  }

  if (timeout && timeout > 0) {
    const timer = setTimeout(() => {
      controller.abort(
        new DOMException(
          `Request timed out after ${timeout}ms`,
          'TimeoutError',
        ),
      );
    }, timeout);
    cleanup.push(() => clearTimeout(timer));
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      for (const dispose of cleanup) dispose();
    },
  };
}

function isNativeBody(value: unknown): value is BodyInit {
  if (typeof value === 'string') return true;
  if (value instanceof ArrayBuffer) return true;
  if (ArrayBuffer.isView(value)) return true;
  if (typeof Blob !== 'undefined' && value instanceof Blob) return true;
  if (typeof FormData !== 'undefined' && value instanceof FormData) return true;
  if (typeof URLSearchParams !== 'undefined' && value instanceof URLSearchParams) {
    return true;
  }
  if (typeof ReadableStream !== 'undefined' && value instanceof ReadableStream) {
    return true;
  }

  return false;
}

function encodeBasicAuth(
  username: string | undefined,
  password: string | undefined,
): string {
  const value = `${username ?? ''}:${password ?? ''}`;
  return `Basic ${btoa(value)}`;
}

function createBody(
  config: ResolvedRequestConfig,
  headers: MapperHeaders,
): BodyInit | undefined {
  if (
    config.data === undefined ||
    config.data === null ||
    config.method === 'get' ||
    config.method === 'head'
  ) {
    return undefined;
  }

  if (isNativeBody(config.data)) return config.data;

  if (!headers['content-type']) {
    headers['content-type'] = 'application/json';
  }

  return JSON.stringify(config.data);
}

function isJsonContentType(contentType: string): boolean {
  return /(?:^|\/|\+)json\b/i.test(contentType);
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function parseResponseData(
  response: Response,
  config: ResolvedRequestConfig,
): Promise<unknown> {
  if (
    response.status === 204 ||
    response.status === 205 ||
    config.method === 'head'
  ) {
    return '';
  }

  switch (config.responseType) {
    case 'arraybuffer':
      return response.arrayBuffer();
    case 'blob':
      return response.blob();
    case 'stream':
      return response.body;
    default: {
      const text = await response.text();
      if (text === '') return '';

      const contentType = response.headers.get('content-type') ?? '';
      if (
        config.responseType === 'json' ||
        isJsonContentType(contentType) ||
        /^[[{]/.test(text.trim())
      ) {
        return parseJson(text);
      }

      return text;
    }
  }
}

function getErrorMessage(error: unknown, signal: AbortSignal | undefined): string {
  if (signal?.reason instanceof Error) return signal.reason.message;
  if (error instanceof Error) return error.message;

  return 'Network request failed';
}

export class FetchTransport implements Transport {
  readonly #host: string;

  constructor(host: string) {
    this.#host = host;
  }

  async request(config: ResolvedRequestConfig): Promise<MapperResponse> {
    const fetchImplementation = globalThis.fetch;

    if (typeof fetchImplementation !== 'function') {
      throw new RestMapperError(
        'The fetch adapter requires a global fetch implementation.',
        { config },
      );
    }

    const headers: MapperHeaders = { ...config.headers };

    if (
      config.auth &&
      !headers.authorization &&
      (config.auth.username !== undefined || config.auth.password !== undefined)
    ) {
      headers.authorization = encodeBasicAuth(
        config.auth.username,
        config.auth.password,
      );
    }

    const body = createBody(config, headers);
    const abort = createAbortBundle(
      config.signal as AbortSignal | undefined,
      config.timeout,
    );
    const credentials =
      config.credentials ??
      (config.withCredentials === true ? 'include' : undefined);

    const init: RequestInit = {
      method: config.method.toUpperCase(),
      headers,
      ...(body === undefined ? {} : { body }),
      ...(abort.signal === undefined ? {} : { signal: abort.signal }),
      ...(credentials === undefined ? {} : { credentials }),
      ...(config.mode === undefined ? {} : { mode: config.mode }),
      ...(config.cache === undefined ? {} : { cache: config.cache }),
      ...(config.redirect === undefined ? {} : { redirect: config.redirect }),
    };

    let response: Response;

    try {
      response = await fetchImplementation(
        buildRequestUrl(this.#host, config.url, config.params),
        init,
      );
    } catch (cause) {
      throw new RestMapperError(getErrorMessage(cause, abort.signal), {
        config,
        cause,
      });
    } finally {
      abort.cleanup();
    }

    const mapped: MapperResponse = {
      data: await parseResponseData(response, config),
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      config,
      request: response,
    };

    const validateStatus =
      config.validateStatus ??
      ((status: number): boolean => status >= 200 && status < 300);

    if (!validateStatus(response.status)) {
      throw new RestMapperError(
        `Request failed with status code ${response.status}`,
        {
          config,
          status: response.status,
          response: mapped,
        },
      );
    }

    return mapped;
  }
}
