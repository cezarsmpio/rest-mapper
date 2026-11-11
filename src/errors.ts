import type { MapperResponse, ResolvedRequestConfig } from './types.js';

interface RestMapperErrorOptions {
  config: ResolvedRequestConfig;
  status?: number;
  response?: MapperResponse;
  cause?: unknown;
}

export class RestMapperError extends Error {
  readonly isRestMapperError = true;
  readonly status: number | undefined;
  readonly response: MapperResponse | undefined;
  readonly config: ResolvedRequestConfig;

  constructor(message: string, options: RestMapperErrorOptions) {
    super(
      message,
      options.cause === undefined ? undefined : { cause: options.cause },
    );
    this.name = 'RestMapperError';
    this.status = options.status;
    this.response = options.response;
    this.config = options.config;
  }
}
