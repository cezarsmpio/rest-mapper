import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createFetchMapper } from '../dist/index.js';

globalThis.fetch = async (input, init) =>
  new Response(
    JSON.stringify({ url: String(input), method: init?.method }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );

const config = {
  host: 'https://api.example.com',
  resources: {
    Health: { get: { url: '/health' } },
  },
};

const esmResponse = await createFetchMapper(config).Health.get({
  params: { page: 2 },
});
assert.equal(esmResponse.status, 200);
assert.deepEqual(esmResponse.data, {
  url: 'https://api.example.com/health?page=2',
  method: 'GET',
});

const require = createRequire(import.meta.url);
const cjs = require('../dist/index.cjs');
const cjsResponse = await cjs.createFetchMapper(config).Health.get();
assert.equal(cjsResponse.status, 200);
assert.deepEqual(cjsResponse.data, {
  url: 'https://api.example.com/health',
  method: 'GET',
});

console.log(`compatibility smoke passed on Node ${process.version}`);
