import type { Transport, TransportAdapter } from '../types.js';
import { AxiosTransport } from './axios.js';
import { FetchTransport } from './fetch.js';

export { AxiosTransport, FetchTransport };

export function createTransport(
  adapter: TransportAdapter,
  host: string,
): Transport {
  return new adapter(host);
}
