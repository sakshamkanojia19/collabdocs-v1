const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const http = require('http');
const { io: createClient } = require('socket.io-client');

const shouldRun = process.env.RUN_DB_TESTS === 'true';

const onceWithTimeout = (emitter, event, timeoutMs = 5000) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      emitter.off(event, handler);
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);
    const handler = (payload) => {
      clearTimeout(timeout);
      resolve(payload);
    };
    emitter.once(event, handler);
  });

test(
  'realtime document roles come from persisted membership',
  { skip: !shouldRun },
  async () => {
    const incomingMongoUri = process.env.TEST_MONGO_URI || process.env.MONGO_URI;
    const queryIndex = incomingMongoUri.indexOf('?');
    const baseUri = queryIndex >= 0 ? incomingMongoUri.slice(0, queryIndex) : incomingMongoUri;
    const query = queryIndex >= 0 ? incomingMongoUri.slice(queryIndex) : '';
    process.env.MONGO_URI = `${baseUri.slice(0, baseUri.lastIndexOf('/') + 1)}collabdocs_monolith_realtime_smoke${query}`;

    const mongoose = require('mongoose');
    const { app, logger } = require('../src/app');
    const {
      connectDatabase,
      disconnectDatabase
    } = require('../src/platform/database');
    const { initializeRealtime } = require('../src/realtime');

    await connectDatabase(logger);
    const server = http.createServer(app);
    const realtime = initializeRealtime(server, logger);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

    const origin = `http://127.0.0.1:${server.address().port}`;
    const apiBase = `${origin}/api/v1`;
    const sockets = [];

    const request = async (path, { token, ...options } = {}) => {
      const response = await fetch(`${apiBase}${path}`, {
        ...options,
        headers: {
          connection: 'close',
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...options.headers
        }
      });
      const text = await response.text();
      return {
        response,
        body: text ? JSON.parse(text) : null
      };
    };

    const connect = async (token) => {
      const socket = createClient(origin, {
        transports: ['websocket'],
        auth: { token },
        forceNew: true
      });
      sockets.push(socket);
      await onceWithTimeout(socket, 'connect');
      return socket;
    };

    try {
      const suffix = crypto.randomUUID();
      const register = async (name, email) => {
        const result = await request('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name,
            email,
            password: 'local-test-password'
          })
        });
        assert.equal(result.response.status, 201);
        return result.body.data;
      };

      const owner = await register('Realtime Owner', `owner-${suffix}@example.test`);
      const viewer = await register('Realtime Viewer', `viewer-${suffix}@example.test`);

      const documentResult = await request('/documents', {
        token: owner.token,
        method: 'POST',
        body: JSON.stringify({
          title: 'Realtime policy smoke test'
        })
      });
      assert.equal(documentResult.response.status, 201);
      const documentId = documentResult.body.document._id;

      const ownerSocket = await connect(owner.token);
      const ownerPresence = onceWithTimeout(ownerSocket, 'activeUsers');
      ownerSocket.emit('joinDocument', {
        documentId,
        role: 'viewer'
      });
      const activeOwnerUsers = await ownerPresence;
      assert.equal(activeOwnerUsers.find((user) => user.userId === owner.user.id)?.role, 'owner');

      const viewerSocket = await connect(viewer.token);
      const rejectedJoin = onceWithTimeout(viewerSocket, 'collaboration:error');
      viewerSocket.emit('joinDocument', {
        documentId,
        role: 'owner'
      });
      assert.match((await rejectedJoin).message, /do not have access/i);

      const shareResult = await request(`/documents/${documentId}/collaborators`, {
        token: owner.token,
        method: 'POST',
        body: JSON.stringify({
          userId: viewer.user.id,
          name: viewer.user.name,
          email: viewer.user.email,
          role: 'viewer'
        })
      });
      assert.equal(shareResult.response.status, 200);

      const viewerPresence = onceWithTimeout(viewerSocket, 'activeUsers');
      viewerSocket.emit('joinDocument', {
        documentId,
        role: 'owner'
      });
      const activeViewerUsers = await viewerPresence;
      assert.equal(activeViewerUsers.find((user) => user.userId === viewer.user.id)?.role, 'viewer');

      const rejectedEdit = onceWithTimeout(viewerSocket, 'collaboration:error');
      viewerSocket.emit('documentChange', {
        documentId,
        html: '<p>Viewer must not write</p>',
        source: 'user'
      });
      assert.match((await rejectedEdit).message, /do not have permission/i);

      const invalidSocket = createClient(origin, {
        transports: ['websocket'],
        auth: {
          token: 'invalid-token'
        },
        forceNew: true
      });
      sockets.push(invalidSocket);
      assert.match((await onceWithTimeout(invalidSocket, 'connect_error')).message, /invalid|expired/i);
    } finally {
      sockets.forEach((socket) => socket.disconnect());
      await mongoose.connection.dropDatabase();
      await realtime.close();
      if (server.listening) {
        await new Promise((resolve) => server.close(resolve));
      }
      await disconnectDatabase(logger);
    }
  }
);
