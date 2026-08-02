const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPER_ADMIN_EMAILS = process.env.SUPER_ADMIN_EMAILS || 'root@collabdocs.test';

const { app } = require('../src/app');

const {
  PLANS,
  clampSeats,
  resolveSeatCapacity,
  isKnownPlan,
  resolveEntitlements
} = require('../src/modules/accounts/entitlements');
const { isSuperAdminUser } = require('../src/modules/accounts/service');

test('free plan keeps local AI but never provider AI', () => {
  const entitlements = resolveEntitlements({ plan: 'free' });
  assert.equal(entitlements.plan, 'free');
  assert.equal(entitlements.features.localAI, true);
  assert.equal(entitlements.features.providerAI, false);
});

test('pro and team plans unlock provider AI', () => {
  assert.equal(resolveEntitlements({ plan: 'pro' }).features.providerAI, true);
  assert.equal(resolveEntitlements({ plan: 'team' }).features.providerAI, true);
});

test('super admin gets provider AI regardless of plan', () => {
  const entitlements = resolveEntitlements({ plan: 'free', isSuperAdmin: true });
  assert.equal(entitlements.features.providerAI, true);
  assert.equal(entitlements.isSuperAdmin, true);
  assert.equal(entitlements.planLabel, 'Super admin');
});

test('unknown plans degrade to free instead of throwing', () => {
  const entitlements = resolveEntitlements({ plan: 'enterprise-2099' });
  assert.equal(entitlements.plan, 'free');
  assert.equal(entitlements.features.providerAI, false);
  assert.equal(isKnownPlan('enterprise-2099'), false);
});

test('seat counts default per plan and clamp to plan ceilings', () => {
  assert.equal(clampSeats('team'), PLANS.team.defaultSeats);
  assert.equal(clampSeats('team', 45), 45);
  assert.equal(clampSeats('team', 100000), PLANS.team.maxSeats);
  assert.equal(clampSeats('pro'), 10);
  assert.equal(clampSeats('pro', 4), 4);
  assert.equal(clampSeats('free', 30), 3);
});

test('every plan can onboard a team within its seat allowance', () => {
  assert.equal(PLANS.free.defaultSeats, 3);
  assert.equal(PLANS.pro.defaultSeats, 10);
  assert.equal(PLANS.team.defaultSeats, 20);
});

test('seat capacity backfills accounts created under older, smaller defaults', () => {
  // Accounts stored with seats:1 before the allowance grew still get the
  // current default, without a data migration.
  assert.equal(resolveSeatCapacity('free', 1), 3);
  assert.equal(resolveSeatCapacity('pro', 1), 10);
  assert.equal(resolveSeatCapacity('team', 45), 45);
  assert.equal(resolveSeatCapacity('free', 99), 3);
  assert.equal(resolveSeatCapacity('pro', undefined), 10);
});

test('super admin status comes from the email allowlist or platform role', () => {
  assert.equal(isSuperAdminUser({ email: 'root@collabdocs.test' }), true);
  assert.equal(isSuperAdminUser({ email: 'ROOT@collabdocs.test'.toLowerCase() }), true);
  assert.equal(isSuperAdminUser({ email: 'someone@else.test' }), false);
  assert.equal(
    isSuperAdminUser({ email: 'someone@else.test', platformRole: 'super_admin' }),
    true
  );
  assert.equal(isSuperAdminUser(null), false);
});

/* HTTP surface: account routes are authenticated; admin routes reject
   authenticated non-admins before any database work happens. */

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
});

const signToken = (claims) =>
  jwt.sign(claims, process.env.JWT_ACCESS_SECRET, { expiresIn: '5m' });

test('account endpoint requires authentication', async () => {
  const response = await fetch(`${baseUrl}/api/v1/account`);
  assert.equal(response.status, 401);
});

test('admin endpoints reject authenticated non-admins with 403', async () => {
  const token = signToken({
    sub: '64b6f0c2a1b2c3d4e5f60718',
    name: 'Regular User',
    email: 'regular@user.test'
  });
  const response = await fetch(`${baseUrl}/api/v1/admin/users`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(response.status, 403);
});
