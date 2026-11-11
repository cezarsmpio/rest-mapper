import { createMapper } from './mapper.js';
import { AxiosTransport, FetchTransport } from './transports/index.js';
import type {
  Mapper,
  MapperConfig,
  MapperConfigWithoutAdapter,
  TransportAdapter,
} from './types.js';

function createMapperWithAdapter<C extends MapperConfig>(
  config: Omit<C, 'adapter'> | undefined,
  adapter: TransportAdapter,
): Mapper<C> {
  return createMapper({ ...config, adapter } as C);
}

export function createAxiosMapper<
  C extends MapperConfigWithoutAdapter = MapperConfigWithoutAdapter,
>(config?: C): Mapper<C> {
  return createMapperWithAdapter<C>(config, AxiosTransport);
}

export function createFetchMapper<
  C extends MapperConfigWithoutAdapter = MapperConfigWithoutAdapter,
>(config?: C): Mapper<C> {
  return createMapperWithAdapter<C>(config, FetchTransport);
}
