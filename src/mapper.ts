import { assertMapperConfig, assertRequestOptions } from './config.js';
import {
  applyRequestInterceptors,
  applyResponseInterceptors,
  handleResponseError,
} from './interceptors.js';
import { deepMerge } from './merge.js';
import { resolveRequest } from './request.js';
import type {
  CrudDefinition,
  CrudMethods,
  Interceptors,
  Mapper,
  MapperConfig,
  MapperRequest,
  MapperResponse,
  RequestOptions,
  ResourceDefinition,
} from './types.js';
import { createTransport } from './transports/index.js';

type RequestFactory = (resource: ResourceDefinition) => MapperRequest;

function createRequestFactory(
  defaults: RequestOptions,
  interceptors: Interceptors | false | undefined,
  transport: ReturnType<typeof createTransport>,
): RequestFactory {
  return (resource) => {
    async function request<T = unknown>(
      options?: RequestOptions,
    ): Promise<MapperResponse<T>> {
      assertRequestOptions(options);

      const config = resolveRequest(resource, options, defaults);
      const intercepted = await applyRequestInterceptors(
        config,
        interceptors,
      );

      try {
        const response = await transport.request(intercepted);
        return (await applyResponseInterceptors(
          response,
          interceptors,
        )) as MapperResponse<T>;
      } catch (error) {
        return await handleResponseError(error, interceptors);
      }
    }

    return request;
  };
}

function createCrudMethods(
  crud: CrudDefinition,
  factory: RequestFactory,
): CrudMethods {
  const defaults = crud.defaults ?? {};
  const { baseURL } = crud;

  return {
    all: factory({
      ...defaults,
      url: baseURL,
      method: 'get',
    }),
    get: factory({
      ...defaults,
      url: `${baseURL}/{id}`,
      method: 'get',
    }),
    create: factory({
      ...defaults,
      url: baseURL,
      method: 'post',
    }),
    update: factory({
      ...defaults,
      url: `${baseURL}/{id}`,
      method: 'patch',
    }),
    delete: factory({
      ...defaults,
      url: `${baseURL}/{id}`,
      method: 'delete',
    }),
  };
}

export function createMapper<C extends MapperConfig = MapperConfig>(
  config?: C,
): Mapper<C> {
  const resolvedConfig = config === undefined ? ({} as C) : config;
  assertMapperConfig(resolvedConfig);

  const defaults = deepMerge<RequestOptions>(
    { method: 'get' },
    resolvedConfig.defaults,
  );
  const interceptors = resolvedConfig.intercept ?? undefined;
  const transport = createTransport(
    resolvedConfig.adapter ?? 'axios',
    resolvedConfig.host ?? '',
  );
  const factory = createRequestFactory(defaults, interceptors, transport);
  const mapper: Record<string, Record<string, MapperRequest>> = {};

  for (const [name, crud] of Object.entries(resolvedConfig.cruds ?? {})) {
    mapper[name] = { ...createCrudMethods(crud, factory) };
  }

  for (const [name, resource] of Object.entries(
    resolvedConfig.resources ?? {},
  )) {
    const methods = mapper[name] ?? {};

    for (const [methodName, definition] of Object.entries(resource)) {
      methods[methodName] = factory(definition);
    }

    mapper[name] = methods;
  }

  return mapper as Mapper<C>;
}
