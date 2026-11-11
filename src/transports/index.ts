import type { Adapter, Transport } from '../types.js';
import { AxiosTransport } from './axios.js';
import { FetchTransport } from './fetch.js';

export function createTransport(adapter: Adapter, host: string): Transport {
  return adapter === 'fetch'
    ? new FetchTransport(host)
    : new AxiosTransport(host);
}
