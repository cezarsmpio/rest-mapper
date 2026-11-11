import { RestMapperError } from '../errors.js';
import type {
  MapperHeaders,
  MapperResponse,
  ResolvedRequestConfig,
  Transport,
} from '../types.js';
import { buildRequestUrl } from '../url.js';

const HTTP_OK = 200;
const HTTP_MULTIPLE_CHOICES = 300;
const HTTP_NO_CONTENT = 204;
const HTTP_RESET_CONTENT = 205;

interface AbortBundle {
  signal: AbortSignal | undefined;
  cleanup: () => void;
}

type FetchRequestInit = RequestInit & {
  dispatcher?: unknown;
};

interface PreparedFetchRequest {
  url: string;
  init: FetchRequestInit;
  abort: AbortBundle;
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

  return (
    value instanceof Blob ||
    value instanceof FormData ||
    value instanceof URLSearchParams ||
    value instanceof ReadableStream
  );
}

function encodeBasicAuth(
  username: string | undefined,
  password: string | undefined,
): string {
  const value = `${username ?? ''}:${password ?? ''}`;
  return `Basic ${btoa(value)}`;
}

function createHeaders(config: ResolvedRequestConfig): MapperHeaders {
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

  return headers;
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

function isEmptyResponse(
  response: Response,
  config: ResolvedRequestConfig,
): boolean {
  return (
    response.status === HTTP_NO_CONTENT ||
    response.status === HTTP_RESET_CONTENT ||
    config.method === 'head'
  );
}

async function parseResponseData(
  response: Response,
  config: ResolvedRequestConfig,
): Promise<unknown> {
  if (isEmptyResponse(response, config)) return '';

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

async function mapFetchResponse(
  response: Response,
  config: ResolvedRequestConfig,
): Promise<MapperResponse> {
  return {
    data: await parseResponseData(response, config),
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    config,
    request: response,
  };
}

function isSuccessfulStatus(status: number): boolean {
  return status >= HTTP_OK && status < HTTP_MULTIPLE_CHOICES;
}

function assertValidStatus(
  response: MapperResponse,
  config: ResolvedRequestConfig,
): void {
  const validateStatus = config.validateStatus ?? isSuccessfulStatus;

  if (!validateStatus(response.status)) {
    throw new RestMapperError(
      `Request failed with status code ${response.status}`,
      {
        config,
        status: response.status,
        response,
      },
    );
  }
}

function getErrorMessage(
  error: unknown,
  signal: AbortSignal | undefined,
): string {
  if (signal?.reason instanceof Error) return signal.reason.message;
  if (error instanceof Error) return error.message;

  return 'Network request failed';
}

function prepareFetchRequest(
  host: string,
  config: ResolvedRequestConfig,
): PreparedFetchRequest {
  const headers = createHeaders(config);
  const body = createBody(config, headers);
  const abort = createAbortBundle(
    config.signal as AbortSignal | undefined,
    config.timeout,
  );
  const credentials =
    config.credentials ??
    (config.withCredentials === true ? 'include' : undefined);

  const init: FetchRequestInit = {
    method: config.method.toUpperCase(),
    headers,
    ...(body === undefined ? {} : { body }),
    ...(abort.signal === undefined ? {} : { signal: abort.signal }),
    ...(credentials === undefined ? {} : { credentials }),
    ...(config.mode === undefined ? {} : { mode: config.mode }),
    ...(config.cache === undefined ? {} : { cache: config.cache }),
    ...(config.redirect === undefined ? {} : { redirect: config.redirect }),
    ...(config.dispatcher === undefined
      ? {}
      : { dispatcher: config.dispatcher }),
  };

  return {
    url: buildRequestUrl(host, config.url, config.params),
    init,
    abort,
  };
}

export class FetchTransport implements Transport {
  readonly #host: string;

  constructor(host: string) {
    this.#host = host;
  }

  protected async getFetchImplementation(
    config: ResolvedRequestConfig,
  ): Promise<typeof fetch> {
    const fetchImplementation = globalThis.fetch;

    if (typeof fetchImplementation !== 'function') {
      throw new RestMapperError(
        'The fetch adapter requires a global fetch implementation.',
        { config },
      );
    }

    return fetchImplementation;
  }

  async request(config: ResolvedRequestConfig): Promise<MapperResponse> {
    const fetchImplementation = await this.getFetchImplementation(config);
    const prepared = prepareFetchRequest(this.#host, config);

    try {
      let response: Response;

      try {
        response = await fetchImplementation(prepared.url, prepared.init);
      } catch (cause) {
        throw new RestMapperError(
          getErrorMessage(cause, prepared.abort.signal),
          { config, cause },
        );
      }

      let mapped: MapperResponse;

      try {
        mapped = await mapFetchResponse(response, config);
      } catch (cause) {
        throw new RestMapperError(
          getErrorMessage(cause, prepared.abort.signal),
          { config, cause },
        );
      }

      assertValidStatus(mapped, config);
      return mapped;
    } finally {
      prepared.abort.cleanup();
    }
  }
}
