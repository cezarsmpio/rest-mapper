const BLOCKED_KEYS = ['__proto__', 'constructor', 'prototype'];

export function isBlockedKey(key: PropertyKey): boolean {
  return typeof key === 'string' && BLOCKED_KEYS.includes(key);
}

export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function cloneValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cloneValue);
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

    for (const [key, value] of Object.entries(source)) {
      if (isBlockedKey(key) || value === undefined) continue;

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
