import { describe, expect, it } from 'vitest';
import { deepMerge, hasOwn, isBlockedKey, isPlainObject } from '../src/merge.js';

describe('merge utilities', () => {
  it('identifies plain objects', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject(Object.create(null) as object)).toBe(true);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject('value')).toBe(false);
    expect(isPlainObject(new Date())).toBe(false);
  });

  it('reports blocked prototype keys', () => {
    expect(isBlockedKey('__proto__')).toBe(true);
    expect(isBlockedKey('constructor')).toBe(true);
    expect(isBlockedKey('prototype')).toBe(true);
    expect(isBlockedKey('safe')).toBe(false);
    expect(isBlockedKey(Symbol('safe'))).toBe(false);
  });

  it('merges nested objects without mutating inputs', () => {
    const defaults = {
      headers: { accept: 'application/json', nested: { one: 1 } },
      data: { keep: true },
      method: 'get',
    };
    const overrides = {
      headers: { authorization: 'token', nested: { two: 2 } },
      method: 'post',
    };

    const result = deepMerge<typeof defaults & typeof overrides>(
      defaults,
      overrides,
    );

    expect(result).toEqual({
      headers: {
        accept: 'application/json',
        authorization: 'token',
        nested: { one: 1, two: 2 },
      },
      data: { keep: true },
      method: 'post',
    });
    expect(defaults).toEqual({
      headers: { accept: 'application/json', nested: { one: 1 } },
      data: { keep: true },
      method: 'get',
    });
    expect(overrides).toEqual({
      headers: { authorization: 'token', nested: { two: 2 } },
      method: 'post',
    });
    expect(result).not.toBe(defaults);
    expect(result.headers).not.toBe(defaults.headers);
  });

  it('replaces arrays with cloned arrays', () => {
    const nested = [{ id: 1 }];
    const result = deepMerge(
      { values: [1, 2] },
      { values: nested },
    ) as { values: Array<{ id: number }> };

    expect(result.values).toEqual([{ id: 1 }]);
    expect(result.values).not.toBe(nested);
    expect(result.values[0]).not.toBe(nested[0]);
  });

  it('keeps non-plain objects by reference', () => {
    const date = new Date('2026-01-01T00:00:00.000Z');
    const result = deepMerge({ date });

    expect(result.date).toBe(date);
  });

  it('ignores undefined values and blocked keys', () => {
    const source = JSON.parse(
      '{"safe":1,"__proto__":{"polluted":true},"constructor":{"bad":true}}',
    ) as Record<string, unknown>;
    source.ignored = undefined;

    const result = deepMerge<Record<string, unknown>>(
      undefined,
      source,
      null as unknown as Record<string, unknown>,
      { safe: 2 },
    );

    expect(result).toEqual({ safe: 2 });
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it('ignores inherited enumerable keys', () => {
    Object.defineProperty(Object.prototype, 'inherited', {
      value: 'ignored',
      enumerable: true,
      configurable: true,
      writable: true,
    });

    try {
      expect(deepMerge({ own: true })).toEqual({ own: true });
    } finally {
      delete (Object.prototype as { inherited?: string }).inherited;
    }
  });

  it('checks own properties', () => {
    expect(hasOwn({ value: true }, 'value')).toBe(true);
    expect(hasOwn({}, 'value')).toBe(false);
  });
});
