import { createMapper } from '../dist/index.js';

export const host = 'https://api.example.com';

export class NoopTransport {
  constructor(host) {
    this.host = host;
  }

  async request(config) {
    return {
      data: { url: config.url, params: config.params },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  }
}

export const mixedConfig = {
  adapter: NoopTransport,
  host,
  defaults: {
    headers: { accept: 'application/json' },
    query: { locale: 'en' },
  },
  resources: {
    User: {
      get: { url: '/users/{id}' },
      search: { url: '/users/search' },
    },
  },
  cruds: {
    Products: { baseURL: '/products' },
  },
};

export function createMixedMapper() {
  return createMapper(mixedConfig);
}

export const requestMapper = createMixedMapper();

export const interceptedMapper = createMapper({
  ...mixedConfig,
  intercept: {
    request: {
      before(config) {
        config.headers.authorization = 'Bearer token';
      },
    },
    response: {
      success(response) {
        return response;
      },
    },
  },
});

export const complexQuery = {
  page: 2,
  sort: 'name',
  filters: { active: true, category: 'hardware' },
  tags: ['new', 'sale'],
};
