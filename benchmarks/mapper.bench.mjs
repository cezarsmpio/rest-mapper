import { bench, describe } from 'node:bench';
import {
  complexQuery,
  createMixedMapper,
  interceptedMapper,
  requestMapper,
} from './fixtures.mjs';

const constructionOps = 10_000;
const requestOps = 5_000;

describe('mapper construction', () => {
  bench('resources + CRUD', (b) => {
    let last;
    b.start();
    for (let i = 0; i < constructionOps; i++) last = createMixedMapper();
    b.end(constructionOps);

    if (typeof last?.Products.all !== 'function') {
      throw new Error('mapper construction failed');
    }
  });
});

describe('request resolution', () => {
  bench('path params', async (b) => {
    let last;
    b.start();
    for (let i = 0; i < requestOps; i++) {
      last = await requestMapper.User.get({ params: { id: 7 } });
    }
    b.end(requestOps);

    if (last?.data.url !== '/users/7') throw new Error('unexpected URL');
  });

  bench('path params + query', async (b) => {
    let last;
    b.start();
    for (let i = 0; i < requestOps; i++) {
      last = await requestMapper.User.get({
        params: { id: 7 },
        query: { page: 2, sort: 'name' },
      });
    }
    b.end(requestOps);

    if (last?.data.url !== '/users/7') throw new Error('unexpected URL');
    if (last?.data.params.page !== 2) throw new Error('unexpected query');
  });

  bench('nested query merge', async (b) => {
    let last;
    b.start();
    for (let i = 0; i < requestOps; i++) {
      last = await requestMapper.User.search({ query: complexQuery });
    }
    b.end(requestOps);

    if (last?.data.params.filters.category !== 'hardware') {
      throw new Error('unexpected query');
    }
  });

  bench('CRUD get', async (b) => {
    let last;
    b.start();
    for (let i = 0; i < requestOps; i++) {
      last = await requestMapper.Products.get({ params: { id: 7 } });
    }
    b.end(requestOps);

    if (last?.data.url !== '/products/7') throw new Error('unexpected URL');
  });
});

describe('interceptors', () => {
  bench('request + response', async (b) => {
    let last;
    b.start();
    for (let i = 0; i < requestOps; i++) {
      last = await interceptedMapper.User.get({ params: { id: 7 } });
    }
    b.end(requestOps);

    if (last?.status !== 200) throw new Error('interceptor failed');
  });
});
