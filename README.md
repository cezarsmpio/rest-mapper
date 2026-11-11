# rest-mapper

A typed, isomorphic REST mapper for Node.js and browsers. Define your API once and call typed methods without repeating URLs, verbs, or request plumbing.

- **TypeScript-first** with inferred resource and CRUD methods.
- **axios by default**, with an opt-in native **fetch** transport.
- **One request shape** for both transports.
- **Path and query parameters** through a single `params` object.
- **Interceptors**, global defaults, and CRUD generation.
- **Dual ESM/CJS** builds and an optional axios peer dependency.

## Install

The default adapter uses axios, so install it alongside the library:

```bash
npm install rest-mapper axios
```

Using only the fetch adapter? Axios is an optional peer and can be skipped:

```bash
npm install rest-mapper
```

## Quick start

```ts
import { createMapper } from 'rest-mapper';

const api = createMapper({
  host: 'https://api.example.com/v1',
  resources: {
    Auth: {
      signin: { url: '/access/signin', method: 'post' },
    },
    User: {
      get: { url: '/users/{id}' },
      save: { url: '/users/{id}', method: 'put' },
    },
  },
  cruds: {
    Products: { baseURL: '/products' },
  },
});

const user = await api.User.get({ params: { id: 3 } });
const products = await api.Products.all({ query: { page: 2 } });
```

CommonJS:

```js
const { createMapper } = require('rest-mapper');
```

## Configuration

```ts
interface MapperConfig {
  host?: string;
  adapter?: TransportAdapter; // default: AxiosTransport
  defaults?: RequestOptions;
  resources?: Record<string, Record<string, ResourceDefinition>>;
  cruds?: Record<string, CrudDefinition>;
  intercept?: Interceptors | false;
}
```

### Resources

Each resource method describes one endpoint:

```ts
const api = createMapper({
  host: 'https://api.example.com',
  resources: {
    Products: {
      list: { url: '/products' },
      byDate: { url: '/products/date/{startDate}/{endDate}' },
    },
  },
});
```

### CRUD

A CRUD group generates five methods from a `baseURL`:

| Method | Request |
| --- | --- |
| `all` | `GET /products` |
| `get` | `GET /products/{id}` |
| `create` | `POST /products` |
| `update` | `PATCH /products/{id}` |
| `delete` | `DELETE /products/{id}` |

```ts
const api = createMapper({
  host: 'https://api.example.com',
  cruds: {
    Products: {
      baseURL: '/products',
      defaults: {
        headers: { accept: 'application/json' },
      },
    },
  },
});

await api.Products.get({ params: { id: 10 } });
```

### Path and query parameters

`params` replaces the old `supplant` API. Scalar keys that match `{placeholders}` are interpolated into the path and URL-encoded. Remaining keys become query parameters.

```ts
await api.Products.byDate({
  params: {
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    status: 'active',
  },
});
// GET /products/date/2026-01-01/2026-01-31?status=active
```

Use `query` when you want to be explicit about query parameters:

```ts
await api.Products.list({
  params: { id: 10 }, // consumed by the path
  query: { page: 2, sort: 'name' },
});
```

### Request options

All axios request options are supported (`data`, `timeout`, `headers`, `responseType`, `validateStatus`, and so on), plus fetch-specific `credentials`, `mode`, `cache`, and `redirect`.

```ts
await api.Products.create({
  data: { name: 'Keyboard' },
  headers: { authorization: 'Bearer token' },
  timeout: 5_000,
});
```

### Defaults

`defaults` apply to every request. Resource definitions and individual calls override them.

```ts
const api = createMapper({
  host: 'https://api.example.com',
  defaults: {
    method: 'get',
    timeout: 3_000,
    headers: { accept: 'application/json' },
    query: { locale: 'en' },
  },
  resources: {
    User: {
      get: { url: '/users/{id}' },
    },
  },
});
```

## Transport adapters

`adapter` accepts a transport constructor. `AxiosTransport` is the default; pass `FetchTransport` to use the platform `fetch`.

```ts
import { createMapper, FetchTransport } from 'rest-mapper';

const api = createMapper({
  adapter: FetchTransport,
  host: 'https://api.example.com',
  cruds: { Products: { baseURL: '/products' } },
});

const response = await api.Products.all();
console.log(response.status, response.data);
```

The response keeps the axios-compatible shape: `{ data, status, statusText, headers, config, request }`.

### Adapter presets

The preset factories encapsulate the transport choice:

```ts
import {
  createAxiosMapper,
  createFetchMapper,
} from 'rest-mapper';

const axiosApi = createAxiosMapper({
  host: 'https://api.example.com',
  cruds: { Products: { baseURL: '/products' } },
});

const fetchApi = createFetchMapper({
  host: 'https://api.example.com',
  cruds: { Products: { baseURL: '/products' } },
});
```

`createAxiosMapper` is equivalent to `createMapper` with `AxiosTransport`. `createFetchMapper` is equivalent to `createMapper` with `FetchTransport`.

### Custom transports

A custom adapter is any class with a `request(config)` method and a `(host)` constructor:

```ts
import {
  createMapper,
  type MapperResponse,
  type ResolvedRequestConfig,
  type Transport,
} from 'rest-mapper';

class MyTransport implements Transport {
  constructor(private readonly host: string) {}

  async request(config: ResolvedRequestConfig): Promise<MapperResponse> {
    // Implement the request and return the standard response shape.
  }
}

const api = createMapper({
  adapter: MyTransport,
  host: 'https://api.example.com',
  resources: {
    Health: { get: { url: '/health' } },
  },
});
```

The fetch transport supports JSON, text, `arraybuffer`, `blob`, and `stream` response types, timeouts, caller-provided `AbortSignal`s, `validateStatus`, basic auth, credentials, and standard fetch request options. HTTP failures reject with a `RestMapperError` that exposes both `error.status` and `error.response`.

The axios transport is unchanged: axios responses and axios errors pass through as before.

## Interceptors

```ts
const api = createMapper({
  host: 'https://api.example.com',
  intercept: {
    request: {
      before(config) {
        config.headers.authorization = 'Bearer token';
      },
      error(error) {
        console.error('request interceptor failed', error);
      },
    },
    response: {
      success(response) {
        return response;
      },
      error(error) {
        console.error('request failed', error);
      },
    },
  },
});
```

`before` and `success` handlers may mutate the value or return a replacement (including a promise). Error handlers observe failures; the original error is rethrown.

## TypeScript

Resource names, method names, CRUD methods, request options, and response helpers are typed. You can specialize response data per call:

```ts
interface Product {
  id: number;
  name: string;
}

const response = await api.Products.get<Product>({ params: { id: 1 } });
console.log(response.data.name); // string
```

Public types include `MapperConfig`, `Mapper`, `MapperResponse`, `Transport`, `TransportAdapter`, `RequestOptions`, `RestMapperError`, and the individual resource/CRUD mapper types.

## Migrating from 1.x

- Replace `new Mapper(config)` with `createMapper(config)`.
- Replace `supplant: { id: 1 }` with `params: { id: 1 }`.
- If you use the default axios adapter, install axios as a peer dependency.
- Replace `adapter: 'fetch'` with `adapter: FetchTransport`, or use `createFetchMapper`.
- `adapter: 'axios'` is no longer needed; axios is the default. Use `createAxiosMapper` for an explicit preset.
- The package is now ESM-first with a CommonJS build. Both named and default exports are available.

## Development

```bash
npm install
npm test
npm run test:coverage
npm run typecheck
npm run build
npm run verify
```

See [CHANGELOG.md](./CHANGELOG.md) for release history and [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## License

MIT © Cezar Sampaio
