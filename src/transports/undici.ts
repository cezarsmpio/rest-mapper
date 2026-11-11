import { RestMapperError } from '../errors.js';
import type { ResolvedRequestConfig } from '../types.js';
import { FetchTransport } from './fetch.js';

export class UndiciTransport extends FetchTransport {
  #fetch: Promise<typeof fetch> | undefined;

  protected override async getFetchImplementation(
    config: ResolvedRequestConfig,
  ): Promise<typeof fetch> {
    const undiciFetch = import('undici').then(
      ({ fetch }) => fetch,
    ) as unknown as Promise<typeof fetch>;

    this.#fetch ??= undiciFetch;

    try {
      return await this.#fetch;
    } catch (cause) {
      throw new RestMapperError(
        'The undici adapter requires the optional peer dependency "undici". Install it with: npm install undici',
        { config, cause },
      );
    }
  }
}
