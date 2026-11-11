export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options';

export type ParamPrimitive = string | number | boolean;

export type ParamValue =
  | ParamPrimitive
  | null
  | undefined
  | Date
  | readonly ParamValue[]
  | { readonly [key: string]: ParamValue };

export type Params = Readonly<Record<string, ParamValue>>;

export type MapperHeaders = Record<string, string>;

export type MapperHeaderValue =
  | string
  | string[]
  | number
  | boolean
  | null
  | undefined;

export interface BasicAuthCredentials {
  username?: string | undefined;
  password?: string | undefined;
}

export type MapperHeadersInput =
  | Record<string, MapperHeaderValue>
  | Headers
  | { toJSON: () => unknown };

export type ResponseType =
  | 'json'
  | 'text'
  | 'blob'
  | 'arraybuffer'
  | 'stream'
  | 'document';

export interface RequestOptionsBase {
  /** Placeholder values are consumed from the URL; remaining keys become query parameters. */
  params?: Params;
  /** Explicit query parameters. Takes precedence over unconsumed `params` keys. */
  query?: Params;
  method?: string;
  url?: string;
  data?: unknown;
  headers?: MapperHeadersInput;
  timeout?: number;
  withCredentials?: boolean;
  auth?: BasicAuthCredentials;
  responseType?: ResponseType;
  validateStatus?: (status: number) => boolean;
  signal?: AbortSignal | null;
  credentials?: RequestCredentials;
  mode?: RequestMode;
  cache?: RequestCache;
  redirect?: RequestRedirect;
  maxRedirects?: number;
  maxContentLength?: number;
  maxBodyLength?: number;
  timeoutErrorMessage?: string;
  responseEncoding?: string;
  xsrfCookieName?: string;
  xsrfHeaderName?: string;
  socketPath?: string;
  allowAbsoluteUrls?: boolean;
  allowedProtocols?: string[];
  decompress?: boolean;
  onUploadProgress?: (progressEvent: unknown) => void;
  onDownloadProgress?: (progressEvent: unknown) => void;
  transformRequest?: unknown;
  transformResponse?: unknown;
  paramsSerializer?: unknown;
  beforeRedirect?: unknown;
  transitional?: unknown;
  fetchOptions?: unknown;
  formSerializer?: unknown;
  maxRate?: unknown;
  env?: unknown;
  proxy?: unknown;
  httpAgent?: unknown;
  httpsAgent?: unknown;
  cancelToken?: unknown;
}

export type RequestOptions = RequestOptionsBase;

export interface ResolvedRequestConfig
  extends Omit<RequestOptionsBase, 'params' | 'query' | 'method'> {
  url: string;
  method: string;
  params: Params;
  headers: MapperHeaders;
}

export interface MapperResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: MapperHeaders;
  config: ResolvedRequestConfig;
  request?: unknown;
}

export interface MapperRequest {
  <T = unknown>(options?: RequestOptions): Promise<MapperResponse<T>>;
}

export interface CrudMethods {
  all: MapperRequest;
  get: MapperRequest;
  create: MapperRequest;
  update: MapperRequest;
  delete: MapperRequest;
}

export interface RequestInterceptor {
  before?: (
    config: ResolvedRequestConfig,
  ) => ResolvedRequestConfig | void | Promise<ResolvedRequestConfig | void>;
  error?: (error: unknown) => unknown | Promise<unknown>;
}

export interface ResponseInterceptor {
  success?: (
    response: MapperResponse,
  ) => MapperResponse | void | Promise<MapperResponse | void>;
  error?: (error: unknown) => unknown | Promise<unknown>;
}

export interface Interceptors {
  request?: RequestInterceptor;
  response?: ResponseInterceptor;
}

export type TransportAdapter = new (host: string) => Transport;
export type MapperConfigWithoutAdapter = Omit<MapperConfig, 'adapter'>;

export type ResourceDefinition = RequestOptions & {
  url: string;
};

export interface CrudDefinition {
  baseURL: string;
  defaults?: RequestOptions;
}

export type ResourcesConfig = Record<string, Record<string, ResourceDefinition>>;
export type CrudsConfig = Record<string, CrudDefinition>;

export interface MapperConfig {
  host?: string;
  resources?: ResourcesConfig;
  cruds?: CrudsConfig;
  defaults?: RequestOptions;
  intercept?: Interceptors | false;
  adapter?: TransportAdapter;
}

type ResourceConfigOf<C extends MapperConfig> = NonNullable<C['resources']>;
type CrudConfigOf<C extends MapperConfig> = NonNullable<C['cruds']>;

export type ResourceMapper<C extends MapperConfig> = {
  [K in keyof ResourceConfigOf<C> & string]: {
    [M in keyof ResourceConfigOf<C>[K] & string]: MapperRequest;
  };
};

export type CrudMapper<C extends MapperConfig> = {
  [K in keyof CrudConfigOf<C> & string]: CrudMethods;
};

export type Mapper<C extends MapperConfig = MapperConfig> = ResourceMapper<C> &
  CrudMapper<C>;

export interface Transport {
  request(config: ResolvedRequestConfig): Promise<MapperResponse>;
}
