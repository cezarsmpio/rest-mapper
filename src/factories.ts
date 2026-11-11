import { createMapper } from './mapper.js';
import {
  AxiosTransport,
  FetchTransport,
  UndiciTransport,
} from './transports/index.js';
import type {
  Mapper,
  MapperConfigWithoutAdapter,
  TransportAdapter,
} from './types.js';

type ConfigWithAdapter<C extends MapperConfigWithoutAdapter> = C & {
  adapter: TransportAdapter;
};

function createMapperWithAdapter<C extends MapperConfigWithoutAdapter>(
  config: Omit<C, 'adapter'> | undefined,
  adapter: TransportAdapter,
): Mapper<ConfigWithAdapter<C>> {
  return createMapper({
    ...config,
    adapter,
  } as ConfigWithAdapter<C>);
}

export function createAxiosMapper<
  C extends MapperConfigWithoutAdapter = MapperConfigWithoutAdapter,
>(config?: C): Mapper<ConfigWithAdapter<C>> {
  return createMapperWithAdapter<C>(config, AxiosTransport);
}

export function createFetchMapper<
  C extends MapperConfigWithoutAdapter = MapperConfigWithoutAdapter,
>(config?: C): Mapper<ConfigWithAdapter<C>> {
  return createMapperWithAdapter<C>(config, FetchTransport);
}

export function createUndiciMapper<
  C extends MapperConfigWithoutAdapter = MapperConfigWithoutAdapter,
>(config?: C): Mapper<ConfigWithAdapter<C>> {
  return createMapperWithAdapter<C>(config, UndiciTransport);
}
