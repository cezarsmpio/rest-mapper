import { isBlockedKey, isPlainObject } from './merge.js';
import type {
  CrudDefinition,
  Interceptors,
  MapperConfig,
  RequestOptions,
  ResourceDefinition,
} from './types.js';

function fail(path: string, expected: string): never {
  throw new TypeError(`${path} must be ${expected}.`);
}

function assertSafeKey(key: string, path: string): void {
  if (isBlockedKey(key)) fail(path, 'a safe property name');
}

function assertOptionalParams(value: unknown, path: string): void {
  if (value !== undefined && !isPlainObject(value)) {
    fail(path, 'a plain object');
  }
}

function assertRequestOptionsObject(value: unknown, path: string): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) fail(path, 'a plain object');

  assertOptionalParams(value.params, `${path}.params`);
  assertOptionalParams(value.query, `${path}.query`);
}

function assertResourceDefinition(
  value: unknown,
  path: string,
): asserts value is ResourceDefinition {
  if (!isPlainObject(value)) fail(path, 'a plain object');
  if (typeof value.url !== 'string') fail(`${path}.url`, 'a string');
  assertRequestOptionsObject(value, path);
}

function assertCrudDefinition(
  value: unknown,
  path: string,
): asserts value is CrudDefinition {
  if (!isPlainObject(value)) fail(path, 'a plain object');
  if (typeof value.baseURL !== 'string') {
    fail(`${path}.baseURL`, 'a string');
  }
  assertRequestOptionsObject(value.defaults, `${path}.defaults`);
}

function assertInterceptors(
  value: unknown,
  path: string,
): asserts value is Interceptors {
  if (!isPlainObject(value)) fail(path, 'a plain object');

  for (const side of ['request', 'response'] as const) {
    const intercept = value[side];
    if (intercept === undefined) continue;
    if (!isPlainObject(intercept)) fail(`${path}.${side}`, 'a plain object');

    for (const [handler, fn] of Object.entries(intercept)) {
      if (
        (handler === 'before' || handler === 'success' || handler === 'error') &&
        typeof fn !== 'function'
      ) {
        fail(`${path}.${side}.${handler}`, 'a function');
      }
    }
  }
}

function assertResourcesConfig(resources: unknown): void {
  if (!isPlainObject(resources)) {
    fail('config.resources', 'a plain object');
  }

  for (const [resourceName, resource] of Object.entries(resources)) {
    assertSafeKey(resourceName, `config.resources.${resourceName}`);
    if (!isPlainObject(resource)) {
      fail(`config.resources.${resourceName}`, 'a plain object');
    }

    for (const [methodName, definition] of Object.entries(resource)) {
      assertSafeKey(
        methodName,
        `config.resources.${resourceName}.${methodName}`,
      );
      assertResourceDefinition(
        definition,
        `config.resources.${resourceName}.${methodName}`,
      );
    }
  }
}

function assertCrudsConfig(cruds: unknown): void {
  if (!isPlainObject(cruds)) {
    fail('config.cruds', 'a plain object');
  }

  for (const [crudName, crud] of Object.entries(cruds)) {
    assertSafeKey(crudName, `config.cruds.${crudName}`);
    assertCrudDefinition(crud, `config.cruds.${crudName}`);
  }
}

export function assertMapperConfig(
  config: unknown,
): asserts config is MapperConfig {
  if (!isPlainObject(config)) fail('config', 'a plain object');

  if (config.host !== undefined && typeof config.host !== 'string') {
    fail('config.host', 'a string');
  }

  if (config.adapter !== undefined && typeof config.adapter !== 'function') {
    fail('config.adapter', 'a transport constructor');
  }

  if (config.intercept !== undefined && config.intercept !== false) {
    assertInterceptors(config.intercept, 'config.intercept');
  }

  assertRequestOptionsObject(config.defaults, 'config.defaults');

  if (config.resources !== undefined) {
    assertResourcesConfig(config.resources);
  }

  if (config.cruds !== undefined) {
    assertCrudsConfig(config.cruds);
  }
}

export function assertRequestOptions(
  options: unknown,
): asserts options is RequestOptions | undefined {
  assertRequestOptionsObject(options, 'request options');
}
