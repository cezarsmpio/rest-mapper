import { describe, expect, it } from 'vitest';
import defaultExport, {
  createMapper,
  RestMapperError,
} from '../src/index.js';
import { createConfig } from './helpers.js';

describe('public exports', () => {
  it('exports createMapper as both named and default', () => {
    expect(defaultExport).toBe(createMapper);
    expect(createMapper).toBeTypeOf('function');
  });

  it('exports a typed RestMapperError with cause support', () => {
    const cause = new Error('root cause');
    const error = new RestMapperError('failed', {
      config: createConfig(),
      status: 500,
      cause,
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('RestMapperError');
    expect(error.isRestMapperError).toBe(true);
    expect(error.status).toBe(500);
    expect(error.cause).toBe(cause);
    expect(error.config.url).toBe('/users');
  });

  it('creates errors without a cause', () => {
    const error = new RestMapperError('failed', { config: createConfig() });

    expect(error.cause).toBeUndefined();
    expect(error.status).toBeUndefined();
    expect(error.response).toBeUndefined();
  });
});
