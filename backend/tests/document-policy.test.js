const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getDocumentRole,
  userHasReadAccess,
  userHasWriteAccess,
  requireOwnership
} = require('../src/modules/documents/policy');

const document = {
  owner: {
    userId: 'owner-id'
  },
  collaborators: [
    {
      userId: 'editor-id',
      role: 'editor'
    },
    {
      userId: 'viewer-id',
      role: 'viewer'
    }
  ]
};

test('document policy derives roles from persisted membership', () => {
  assert.equal(getDocumentRole(document, 'owner-id'), 'owner');
  assert.equal(getDocumentRole(document, 'editor-id'), 'editor');
  assert.equal(getDocumentRole(document, 'viewer-id'), 'viewer');
  assert.equal(getDocumentRole(document, 'unknown-id'), null);
});

test('document policy separates read and write access', () => {
  assert.equal(userHasReadAccess(document, 'viewer-id'), true);
  assert.equal(userHasWriteAccess(document, 'viewer-id'), false);
  assert.equal(userHasWriteAccess(document, 'editor-id'), true);
  assert.equal(userHasWriteAccess(document, 'owner-id'), true);
  assert.equal(userHasReadAccess(document, 'unknown-id'), false);
});

test('ownership checks reject collaborators', () => {
  assert.doesNotThrow(() => requireOwnership(document, 'owner-id'));
  assert.throws(
    () => requireOwnership(document, 'editor-id'),
    (error) => error.status === 403
  );
});
