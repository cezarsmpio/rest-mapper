import type { Transport, TransportAdapter } from '../types.js';
import { AxiosTransport } from './axios.js';
import { FetchTransport } from './fetch.js';
import { UndiciTransport } from './undici.js';

export { AxiosTransport, FetchTransport, UndiciTransport };

export function createTransport(
  adapter: TransportAdapter,
  host: string,
): Transport {
  return new adapter(host);
}
