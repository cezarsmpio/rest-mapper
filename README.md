# rest-mapper

A typed, isomorphic REST mapper for Node.js and browsers. Define your API once and call typed methods without repeating URLs, verbs, or request plumbing.

> **Version 2 is a breaking release.** See [Migrating from 1.x](https://github.com/cezarsmpio/rest-mapper#migrating-from-1x) before upgrading.

- **TypeScript-first** with inferred resource and CRUD methods.
- **axios, fetch, and undici transports** with an explicit transport adapter.
- **One request shape** for every transport.
- **Path and query parameters** through a single `params` object.
- **Interceptors**, global defaults, and CRUD generation.
- **Dual ESM/CJS** builds and optional axios/undici peer dependencies.

## Install

Install the peer dependency for the transport you plan to use:

```bash
# axios transport
npm install rest-mapper axios

# undici transport
npm install rest-mapper undici

# fetch-only transport needs no extra dependency
npm install rest-mapper
```

## Quick start

```ts
import { createAxiosMapper } from 'rest-mapper';

const api = createAxiosMapper({
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
const { createAxiosMapper } = require('rest-mapper');
```

## Configuration

```ts
interface MapperConfig {
  host?: string;
  adapter: TransportAdapter;
  defaults?: RequestOptions;
  resources?: Record<string, Record<string, ResourceDefinition>>;
  cruds?: Record<string, CrudDefinition>;
  intercept?: Interceptors | false;
}
```

### Resources

Each resource method describes one endpoint:

```ts
const api = createAxiosMapper({
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
const api = createAxiosMapper({
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

`params` replaces the old `supplant` API and is used only for `{placeholders}` in the URL path. `query` is used only for query parameters. Keys in `params` that do not match a placeholder are ignored.

```ts
await api.Products.byDate({
  params: {
    startDate: '2026-01-01',
    endDate: '2026-01-31',
  },
  query: {
    status: 'active',
  },
});
// GET /products/date/2026-01-01/2026-01-31?status=active
```

```ts
await api.Products.list({
  params: { id: 10 },
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
const api = createAxiosMapper({
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

`adapter` is required and accepts a transport constructor. The built-in transports are `AxiosTransport`, `FetchTransport`, and `UndiciTransport`.

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

### Undici transport

`UndiciTransport` uses undici's `fetch` implementation and supports a custom `dispatcher`, which is useful for connection pooling, proxies, and custom agents:

```ts
import { createUndiciMapper } from 'rest-mapper';
import { ProxyAgent } from 'undici';

const api = createUndiciMapper({
  host: 'https://api.example.com',
  defaults: {
    dispatcher: new ProxyAgent('http://proxy.example.com:8080'),
  },
});
```

The response keeps the axios-compatible shape: `{ data, status, statusText, headers, config, request }`.

### Adapter presets

The preset factories encapsulate the transport choice:

```ts
import {
  createAxiosMapper,
  createFetchMapper,
  createUndiciMapper,
} from 'rest-mapper';

const axiosApi = createAxiosMapper({
  host: 'https://api.example.com',
  cruds: { Products: { baseURL: '/products' } },
});

const fetchApi = createFetchMapper({
  host: 'https://api.example.com',
  cruds: { Products: { baseURL: '/products' } },
});

const undiciApi = createUndiciMapper({
  host: 'https://api.example.com',
  cruds: { Products: { baseURL: '/products' } },
});
```

Each preset is equivalent to calling `createMapper` with the matching transport constructor.

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
    throw new Error('Implement the request and return the standard response shape.');
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

The fetch and undici transports support JSON, text, `arraybuffer`, `blob`, and `stream` response types, timeouts, caller-provided `AbortSignal`s, `validateStatus`, basic auth, credentials, and standard request options. HTTP failures reject with a `RestMapperError` that exposes both `error.status` and `error.response`.

The axios transport is unchanged: axios responses and axios errors pass through as before.

## Interceptors

```ts
const api = createAxiosMapper({
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

- Replace `new Mapper(config)` with `createMapper(config)` and provide an `adapter`.
- Use `createAxiosMapper`, `createFetchMapper`, or `createUndiciMapper` when you want a preset.
- Replace `supplant: { id: 1 }` with `params: { id: 1 }`.
- Install axios for `AxiosTransport` or undici for `UndiciTransport`; `FetchTransport` needs neither.
- Replace `adapter: 'fetch'` with `adapter: FetchTransport`.
- Replace `adapter: 'axios'` with `adapter: AxiosTransport`.
- The package is now ESM-first with a CommonJS build. Both named and default exports are available.

## Development

```bash
npm install
npm test
npm run test:coverage
npm run typecheck
npm run build
npm run verify
npm run bench
```

See [benchmarks](https://github.com/cezarsmpio/rest-mapper/blob/main/benchmarks/README.md) for benchmark details, [CHANGELOG.md](https://github.com/cezarsmpio/rest-mapper/blob/main/CHANGELOG.md) for release history, and [CONTRIBUTING.md](https://github.com/cezarsmpio/rest-mapper/blob/main/CONTRIBUTING.md) for contribution guidelines.

## License

MIT © Cezar Sampaio
