import type {
  Interceptors,
  MapperResponse,
  ResolvedRequestConfig,
} from './types.js';

export async function applyRequestInterceptors(
  config: ResolvedRequestConfig,
  interceptors: Interceptors | false | undefined,
): Promise<ResolvedRequestConfig> {
  const request = interceptors ? interceptors.request : undefined;
  if (!request?.before) return config;

  try {
    return (await request.before(config)) ?? config;
  } catch (error) {
    if (request.error) await request.error(error);
    throw error;
  }
}

export async function applyResponseInterceptors(
  response: MapperResponse,
  interceptors: Interceptors | false | undefined,
): Promise<MapperResponse> {
  const intercept = interceptors ? interceptors.response : undefined;
  if (!intercept?.success) return response;

  try {
    return (await intercept.success(response)) ?? response;
  } catch (error) {
    if (intercept.error) await intercept.error(error);
    throw error;
  }
}

export async function handleResponseError(
  error: unknown,
  interceptors: Interceptors | false | undefined,
): Promise<never> {
  const intercept = interceptors ? interceptors.response : undefined;
  if (!intercept?.error) throw error;

  try {
    await intercept.error(error);
  } catch (interceptorError) {
    throw interceptorError;
  }

  throw error;
}
