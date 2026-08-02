const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getDocumentRole,
  userHasReadAccess,
  userHasWriteAccess
} = require('../src/modules/documents/policy');
const { accessFilterForUser } = require('../src/modules/documents/service');

const TENANT_A = 'account-aaa';
const TENANT_B = 'account-bbb';

const workspaceDoc = {
  accountId: TENANT_A,
  visibility: 'workspace',
  owner: { userId: 'owner-1' },
  collaborators: [{ userId: 'editor-1', role: 'editor' }]
};

const privateDoc = {
  accountId: TENANT_A,
  visibility: 'private',
  owner: { userId: 'owner-1' },
  collaborators: []
};

test('workspace visibility grants viewer access to same-tenant members only', () => {
  assert.equal(getDocumentRole(workspaceDoc, 'stranger', TENANT_A), 'viewer');
  assert.equal(getDocumentRole(workspaceDoc, 'stranger', TENANT_B), null);
  assert.equal(getDocumentRole(workspaceDoc, 'stranger', null), null);
});

test('workspace visibility never grants write access', () => {
  assert.equal(userHasWriteAccess(workspaceDoc, 'stranger'), false);
  assert.equal(userHasWriteAccess(workspaceDoc, 'editor-1'), true);
  assert.equal(userHasWriteAccess(workspaceDoc, 'owner-1'), true);
});

test('private documents ignore tenancy entirely', () => {
  assert.equal(userHasReadAccess(privateDoc, 'stranger', TENANT_A), false);
  assert.equal(userHasReadAccess(privateDoc, 'owner-1'), true);
});

test('explicit ACL roles win over the tenant viewer fallback', () => {
  assert.equal(getDocumentRole(workspaceDoc, 'editor-1', TENANT_A), 'editor');
  assert.equal(getDocumentRole(workspaceDoc, 'owner-1', TENANT_A), 'owner');
});

test('documents without a tenant never match a tenant claim', () => {
  const orphan = { visibility: 'workspace', owner: { userId: 'owner-1' }, collaborators: [] };
  assert.equal(getDocumentRole(orphan, 'stranger', TENANT_A), null);
});

test('access filter only widens when an accountId is supplied', () => {
  const withoutTenant = accessFilterForUser('user-1');
  assert.equal(withoutTenant.$or.length, 2);

  const withTenant = accessFilterForUser('user-1', TENANT_A);
  assert.equal(withTenant.$or.length, 3);
  assert.deepEqual(withTenant.$or[2], {
    accountId: TENANT_A,
    visibility: 'workspace'
  });
});

test('access filter always excludes archived documents', () => {
  assert.equal(accessFilterForUser('user-1', TENANT_A).isArchived, false);
});
