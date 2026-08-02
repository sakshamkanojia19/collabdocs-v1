const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('../src/app');

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

after(async () => {
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
});

test('health is intentionally minimal', async () => {
  const response = await fetch(`${baseUrl}/health`, {
    headers: { connection: 'close' }
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');
  assert.deepEqual(Object.keys(body).sort(), ['status', 'timestamp']);
});

test('API status does not expose internal module composition', async () => {
  const response = await fetch(`${baseUrl}/api/v1/status`, {
    headers: { connection: 'close' }
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');
  assert.equal(Object.hasOwn(body, 'modules'), false);
  assert.equal(Object.hasOwn(body, 'architecture'), false);
});

test('knowledge status is public and exposes capabilities only', async () => {
  const response = await fetch(`${baseUrl}/api/v1/ai/status`, {
    headers: { connection: 'close' }
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.service, 'knowledge');
  assert.equal(body.available, true);
  assert.equal(body.capabilities.summaries, true);
  assert.equal(body.capabilities.mindMaps, true);
  assert.equal(typeof body.capabilities.documentQuestions, 'boolean');
  assert.equal(Object.hasOwn(body, 'apiKey'), false);
  assert.equal(Object.hasOwn(body, 'configured'), false);
  assert.equal(Object.hasOwn(body, 'model'), false);
  assert.equal(Object.hasOwn(body, 'embeddingModel'), false);
  assert.equal(Object.hasOwn(body, 'generationModes'), false);
});

test('AI artifact libraries require an authenticated workspace session', async () => {
  const response = await fetch(`${baseUrl}/api/v1/ai/artifacts`, {
    headers: { connection: 'close' }
  });
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.success, false);
});

test('legacy status paths remain compatible', async () => {
  const paths = [
    '/api/v1/users/status',
    '/api/v1/collaboration/status',
    '/api/v1/search/status',
    '/api/v1/worker/status'
  ];

  for (const path of paths) {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { connection: 'close' }
    });
    assert.equal(response.status, 200);
  }
});

test('unknown routes use the shared error contract', async () => {
  const response = await fetch(`${baseUrl}/api/v1/does-not-exist`, {
    headers: { connection: 'close' }
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.equal(body.error, 'Resource not found');
  assert.equal(body.error.includes('/api/'), false);
});

test('unapproved browser origins are rejected', async () => {
  const response = await fetch(`${baseUrl}/health`, {
    headers: {
      connection: 'close',
      Origin: 'https://not-allowed.example'
    }
  });

  assert.equal(response.status, 403);
});
