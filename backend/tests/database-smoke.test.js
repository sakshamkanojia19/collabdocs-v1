const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const shouldRun = process.env.RUN_DB_TESTS === 'true';

test(
  'database-backed identity, documents, sharing, and chat workflow',
  { skip: !shouldRun },
  async () => {
    const incomingMongoUri = process.env.TEST_MONGO_URI || process.env.MONGO_URI;
    const queryIndex = incomingMongoUri.indexOf('?');
    const baseUri = queryIndex >= 0 ? incomingMongoUri.slice(0, queryIndex) : incomingMongoUri;
    const query = queryIndex >= 0 ? incomingMongoUri.slice(queryIndex) : '';
    process.env.MONGO_URI = `${baseUri.slice(0, baseUri.lastIndexOf('/') + 1)}collabdocs_monolith_api_smoke${query}`;

    const mongoose = require('mongoose');
    const { app, logger } = require('../src/app');
    const {
      connectDatabase,
      disconnectDatabase
    } = require('../src/platform/database');

    await connectDatabase(logger);

    const server = await new Promise((resolve) => {
      const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
    });
    const baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;

    const request = async (path, { token, ...options } = {}) => {
      const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
          connection: 'close',
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...options.headers
        }
      });
      const text = await response.text();
      const body = text ? JSON.parse(text) : null;
      return { response, body };
    };

    try {
      const suffix = crypto.randomUUID();
      const ownerEmail = `owner-${suffix}@example.test`;
      const collaboratorEmail = `collaborator-${suffix}@example.test`;

      const register = (name, email) =>
        request('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name,
            email,
            password: 'local-test-password'
          })
        });

      const ownerRegistration = await register('Smoke Owner', ownerEmail);
      const collaboratorRegistration = await register('Smoke Collaborator', collaboratorEmail);
      assert.equal(ownerRegistration.response.status, 201);
      assert.equal(collaboratorRegistration.response.status, 201);

      const owner = ownerRegistration.body.data;
      const collaborator = collaboratorRegistration.body.data;

      const me = await request('/auth/me', {
        token: owner.token
      });
      assert.equal(me.response.status, 200);
      assert.equal(me.body.data.user.email, ownerEmail);

      const createdDocument = await request('/documents', {
        token: owner.token,
        method: 'POST',
        body: JSON.stringify({
          title: 'Monolith smoke document',
          content: {
            html: '<p>Safe migration smoke test</p>'
          }
        })
      });
      assert.equal(createdDocument.response.status, 201);
      const documentId = createdDocument.body.document._id;

      if (!process.env.OPENAI_API_KEY) {
        const unconfiguredAi = await request(`/ai/documents/${documentId}/summary`, {
          token: owner.token,
          method: 'POST'
        });
        assert.equal(unconfiguredAi.response.status, 503);
        assert.match(unconfiguredAi.body.error, /OPENAI_API_KEY/i);
      }

      const sharedDocument = await request(`/documents/${documentId}/collaborators`, {
        token: owner.token,
        method: 'POST',
        body: JSON.stringify({
          userId: collaborator.user.id,
          name: collaborator.user.name,
          email: collaborator.user.email,
          role: 'editor'
        })
      });
      assert.equal(sharedDocument.response.status, 200);

      const collaboratorRead = await request(`/documents/${documentId}`, {
        token: collaborator.token
      });
      assert.equal(collaboratorRead.response.status, 200);

      const createdGroup = await request('/chat/groups', {
        token: owner.token,
        method: 'POST',
        body: JSON.stringify({
          name: 'Monolith smoke chat',
          participants: [
            {
              userId: collaborator.user.id,
              name: collaborator.user.name,
              email: collaborator.user.email,
              role: 'member'
            }
          ],
          context: {
            type: 'document',
            documentId
          }
        })
      });
      assert.equal(createdGroup.response.status, 201);
      const groupId = createdGroup.body.group.id;

      const createdMessage = await request(`/chat/groups/${groupId}/messages`, {
        token: collaborator.token,
        method: 'POST',
        body: JSON.stringify({
          content: 'Database-backed modular monolith works.'
        })
      });
      assert.equal(createdMessage.response.status, 201);
      assert.equal(createdMessage.body.message.content, 'Database-backed modular monolith works.');
    } finally {
      await mongoose.connection.dropDatabase();
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(resolve));
      await disconnectDatabase(logger);
    }
  }
);
