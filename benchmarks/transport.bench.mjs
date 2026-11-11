import { bench, describe } from 'node:bench';
import { createFetchMapper, FetchTransport } from '../dist/index.js';

const requestOps = 5_000;
const host = 'https://api.example.com';
const config = {
  url: '/health',
  method: 'get',
  params: { page: 2 },
  headers: { accept: 'application/json' },
};

const response = {
  status: 200,
  statusText: 'OK',
  headers: new Headers({ 'content-type': 'application/json' }),
  text: async () => '{"ok":true}',
};

let requestedUrl = '';
globalThis.fetch = async (input) => {
  requestedUrl = String(input);
  return response;
};

const transport = new FetchTransport(host);
const api = createFetchMapper({
  host,
  resources: {
    User: { get: { url: '/users/{id}' } },
  },
});

describe('fetch transport', () => {
  bench('JSON response', async (b) => {
    let last;
    b.start();
    for (let i = 0; i < requestOps; i++) last = await transport.request(config);
    b.end(requestOps);

    if (last?.status !== 200) throw new Error('transport failed');
  });

  bench('mapper path + query', async (b) => {
    let last;
    b.start();
    for (let i = 0; i < requestOps; i++) {
      last = await api.User.get({
        params: { id: 7 },
        query: { page: 2, sort: 'name' },
      });
    }
    b.end(requestOps);

    if (last?.status !== 200) throw new Error('transport failed');
    if (requestedUrl !== `${host}/users/7?page=2&sort=name`) {
      throw new Error(`unexpected URL: ${requestedUrl}`);
    }
  });
});
