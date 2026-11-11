import { expectTypeOf, it } from 'vitest';
import {
  createMapper,
  type MapperRequest,
  type MapperResponse,
} from '../src/index.js';

interface Product {
  id: number;
  name: string;
}

it('infers resource and CRUD methods from config', () => {
  const api = createMapper({
    resources: {
      User: {
        get: { url: '/users/{id}' },
      },
    },
    cruds: {
      Products: { baseURL: '/products' },
    },
  });

  expectTypeOf<typeof api.User.get>().toEqualTypeOf<MapperRequest>();
  expectTypeOf<typeof api.Products.all>().toEqualTypeOf<MapperRequest>();
  expectTypeOf<typeof api.Products.get>().toEqualTypeOf<MapperRequest>();
  expectTypeOf<typeof api.Products.create>().toEqualTypeOf<MapperRequest>();
  expectTypeOf<typeof api.Products.update>().toEqualTypeOf<MapperRequest>();
  expectTypeOf<typeof api.Products.delete>().toEqualTypeOf<MapperRequest>();

  const typedGet = api.Products.get<Product>;
  expectTypeOf(typedGet).returns.toEqualTypeOf<
    Promise<MapperResponse<Product>>
  >();

  // @ts-expect-error Unknown resource names are rejected.
  type Missing = typeof api.Missing;
});
