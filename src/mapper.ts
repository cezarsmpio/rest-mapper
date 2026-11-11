import { assertMapperConfig, assertRequestOptions } from './config.js';
import {
  applyRequestInterceptors,
  applyResponseInterceptors,
  handleResponseError,
} from './interceptors.js';
import { deepMerge } from './merge.js';
import { createRequestResolver } from './request.js';
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
    let resolve: ReturnType<typeof createRequestResolver> | undefined;
    let hasInterceptors: boolean | undefined;

    async function request<T = unknown>(
      options?: RequestOptions,
    ): Promise<MapperResponse<T>> {
      if (options !== undefined) assertRequestOptions(options);

      // Resolve once so the common no-interceptor path stays allocation-free.
      hasInterceptors ??= Boolean(
        interceptors && (interceptors.request || interceptors.response),
      );

      const config = (resolve ??= createRequestResolver(resource, defaults))(
        options,
      );
      const interceptRequest =
        hasInterceptors && interceptors && interceptors.request?.before;
      const intercepted = interceptRequest
        ? await applyRequestInterceptors(config, interceptors)
        : config;

      try {
        const response = await transport.request(intercepted);
        const interceptResponse =
          hasInterceptors && interceptors && interceptors.response?.success;
        return (interceptResponse
          ? await applyResponseInterceptors(response, interceptors)
          : response) as MapperResponse<T>;
      } catch (error) {
        const interceptResponseError =
          hasInterceptors && interceptors && interceptors.response?.error;
        if (interceptResponseError) {
          return await handleResponseError(error, interceptors);
        }

        throw error;
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

function buildMapper(
  config: MapperConfig,
  factory: RequestFactory,
): Record<string, Record<string, MapperRequest>> {
  const mapper: Record<string, Record<string, MapperRequest>> = {};

  for (const [name, crud] of Object.entries(config.cruds ?? {})) {
    mapper[name] = { ...createCrudMethods(crud, factory) };
  }

  for (const [name, resource] of Object.entries(config.resources ?? {})) {
    const methods = mapper[name] ?? {};

    for (const [methodName, definition] of Object.entries(resource)) {
      methods[methodName] = factory(definition);
    }

    mapper[name] = methods;
  }

  return mapper;
}

export function createMapper<C extends MapperConfig>(
  config: C,
): Mapper<C> {
  assertMapperConfig(config);

  const defaults = deepMerge<RequestOptions>(
    { method: 'get' },
    config.defaults,
  );
  const interceptors = config.intercept ?? undefined;
  const transport = createTransport(config.adapter, config.host ?? '');
  const factory = createRequestFactory(defaults, interceptors, transport);

  return buildMapper(config, factory) as Mapper<C>;
}
