import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import { RestMapperError } from '../errors.js';
import type {
  MapperResponse,
  ResolvedRequestConfig,
  Transport,
} from '../types.js';

export class AxiosTransport implements Transport {
  readonly #host: string;
  #instance: Promise<AxiosInstance> | undefined;

  constructor(host: string) {
    this.#host = host;
  }

  #getInstance(): Promise<AxiosInstance> {
    this.#instance ??= import('axios').then((module) => {
      const axios = module.default;
      return axios.create({ baseURL: this.#host });
    });

    return this.#instance;
  }

  async request(config: ResolvedRequestConfig): Promise<MapperResponse> {
    let instance: AxiosInstance;

    try {
      instance = await this.#getInstance();
    } catch (cause) {
      throw new RestMapperError(
        'The axios adapter requires the optional peer dependency "axios". Install it with: npm install axios',
        { config, cause },
      );
    }

    return (await instance.request(
      config as AxiosRequestConfig,
    )) as unknown as MapperResponse;
  }
}
