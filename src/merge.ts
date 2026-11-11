export function isBlockedKey(key: PropertyKey): boolean {
  return (
    key === '__proto__' ||
    key === 'constructor' ||
    key === 'prototype'
  );
}

export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function cloneValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    const clone = new Array<unknown>(value.length);
    for (let i = 0; i < value.length; i++) clone[i] = cloneValue(value[i]);
    return clone;
  }

  if (isPlainObject(value)) return deepMerge(value);

  return value;
}

/**
 * Deeply merges plain objects without mutating any input. Arrays are cloned,
 * non-plain objects are kept by reference, and prototype-pollution keys are
 * ignored.
 */
export function deepMerge<T extends object = Record<string, unknown>>(
  ...sources: ReadonlyArray<object | undefined>
): T {
  const result: Record<string, unknown> = {};

  for (const source of sources) {
    if (!isPlainObject(source)) continue;

    for (const key in source) {
      if (!Object.hasOwn(source, key)) continue;

      const value = source[key];
      if (value === undefined || isBlockedKey(key)) continue;

      const existing = result[key];

      if (isPlainObject(value)) {
        result[key] = deepMerge(
          isPlainObject(existing) ? existing : {},
          value,
        );
      } else {
        result[key] = cloneValue(value);
      }
    }
  }

  return result as T;
}

export function hasOwn(
  value: object,
  key: PropertyKey,
): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}
