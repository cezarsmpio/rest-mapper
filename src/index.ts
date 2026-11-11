export { RestMapperError } from './errors.js';
export {
  createAxiosMapper,
  createFetchMapper,
} from './factories.js';
export { createMapper } from './mapper.js';
export { AxiosTransport, FetchTransport } from './transports/index.js';
export type {
  BasicAuthCredentials,
  CrudDefinition,
  CrudMapper,
  CrudMethods,
  HttpMethod,
  Interceptors,
  Mapper,
  MapperConfig,
  MapperConfigWithoutAdapter,
  MapperHeaderValue,
  MapperHeaders,
  MapperHeadersInput,
  MapperRequest,
  MapperResponse,
  Params,
  ParamPrimitive,
  ParamValue,
  RequestInterceptor,
  RequestOptions,
  RequestOptionsBase,
  ResolvedRequestConfig,
  ResourceDefinition,
  ResourceMapper,
  ResponseInterceptor,
  ResponseType,
  Transport,
  TransportAdapter,
} from './types.js';

export { createMapper as default } from './mapper.js';
