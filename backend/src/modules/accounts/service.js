const createHttpError = require('http-errors');
const { config } = require('../../platform/config');
const Account = require('./models/Account');
const {
  PLANS,
  PLAN_RANK,
  isKnownPlan,
  clampSeats,
  resolveSeatCapacity,
  resolveEntitlements
} = require('./entitlements');
const { findUserByEmail } = require('../identity/service');

/**
 * Super-admin status comes from the SUPER_ADMIN_EMAILS allowlist or a
 * platformRole persisted on the user document. JWT payloads carry email, so
 * the env path needs no extra database read on hot paths.
 */
const isSuperAdminUser = (user) =>
  Boolean(
    user &&
      (user.platformRole === 'super_admin' ||
        (user.email && config.superAdminEmails.includes(String(user.email).toLowerCase())))
  );

const seatsUsed = (account) => (account.members?.length || 0) + 1; // owner holds a seat

const accountToDto = (account, { includeMembers = false } = {}) => ({
  id: String(account._id),
  name: account.name,
  plan: account.plan,
  planLabel: PLANS[account.plan]?.label || account.plan,
  seats: resolveSeatCapacity(account.plan, account.seats),
  seatsUsed: seatsUsed(account),
  owner: {
    userId: String(account.owner.userId),
    name: account.owner.name,
    email: account.owner.email
  },
  ...(includeMembers
    ? {
        members: (account.members || []).map((member) => ({
          userId: String(member.userId),
          name: member.name,
          email: member.email,
          addedAt: member.addedAt
        }))
      }
    : {})
});

/**
 * The account whose entitlements apply to a user: the highest-ranked plan
 * among accounts they own or occupy a seat in. A member of someone's Team
 * account gets Team features even though their personal account is free.
 */
const getPrimaryAccountForUser = async (user) => {
  const accounts = await Account.find({
    $or: [{ 'owner.userId': user.id }, { 'members.userId': user.id }]
  });

  if (accounts.length > 0) {
    return accounts.reduce((best, candidate) =>
      (PLAN_RANK[candidate.plan] ?? 0) > (PLAN_RANK[best.plan] ?? 0) ? candidate : best
    );
  }

  return Account.create({
    name: `${user.name || 'Personal'}'s workspace`,
    plan: 'free',
    seats: 1,
    owner: { userId: user.id, name: user.name, email: user.email }
  });
};

const getEntitlementsForUser = async (user) => {
  const superAdmin = isSuperAdminUser(user);
  const account = await getPrimaryAccountForUser(user);
  const isOwner = String(account.owner.userId) === String(user.id);
  return {
    account: {
      ...accountToDto(account, { includeMembers: isOwner || superAdmin }),
      isOwner
    },
    entitlements: resolveEntitlements({ plan: account.plan, isSuperAdmin: superAdmin })
  };
};

/**
 * Grant a plan to a user's OWNED account (created if missing). Plan changes
 * are super-admin-only until a payment processor exists.
 */
const setPlanForUser = async ({ targetUser, plan, seats, actor }) => {
  if (!isKnownPlan(plan)) {
    throw createHttpError(422, `Unknown plan "${plan}"`);
  }
  const nextSeats = clampSeats(plan, seats);

  let account = await Account.findOne({ 'owner.userId': targetUser._id });
  if (!account) {
    account = new Account({
      name: `${targetUser.name || 'Personal'}'s workspace`,
      owner: { userId: targetUser._id, name: targetUser.name, email: targetUser.email }
    });
  }

  if (seatsUsed(account) > nextSeats) {
    throw createHttpError(
      409,
      `This account already uses ${seatsUsed(account)} seats; reduce members before shrinking to ${nextSeats}.`
    );
  }

  account.plan = plan;
  account.seats = nextSeats;
  account.planUpdatedAt = new Date();
  account.planUpdatedBy = { userId: actor.id, name: actor.name, email: actor.email };
  await account.save();
  return account;
};

const addMemberToAccount = async ({ owner, memberEmail }) => {
  const account = await Account.findOne({ 'owner.userId': owner.id });
  if (!account) {
    throw createHttpError(404, 'You do not own an account yet');
  }

  const member = await findUserByEmail(memberEmail);
  if (!member) {
    throw createHttpError(404, 'No CollabDocs user exists with that email');
  }
  if (String(member._id) === String(account.owner.userId)) {
    throw createHttpError(409, 'The owner already holds a seat');
  }
  if (account.members.some((entry) => String(entry.userId) === String(member._id))) {
    throw createHttpError(409, 'That user already occupies a seat');
  }
  const capacity = resolveSeatCapacity(account.plan, account.seats);
  if (seatsUsed(account) + 1 > capacity) {
    const error = createHttpError(
      402,
      `All ${capacity} seats on the ${PLANS[account.plan]?.label || account.plan} plan are in use. Upgrade to onboard more people.`
    );
    error.code = 'UPGRADE_REQUIRED';
    throw error;
  }

  account.members.push({ userId: member._id, name: member.name, email: member.email });
  await account.save();
  return account;
};

const removeMemberFromAccount = async ({ owner, memberUserId }) => {
  const account = await Account.findOne({ 'owner.userId': owner.id });
  if (!account) {
    throw createHttpError(404, 'You do not own an account yet');
  }
  const before = account.members.length;
  account.members = account.members.filter(
    (entry) => String(entry.userId) !== String(memberUserId)
  );
  if (account.members.length === before) {
    throw createHttpError(404, 'That user does not occupy a seat');
  }
  await account.save();
  return account;
};

/**
 * The tenant a user's new data is stamped with and read against. Kept as a
 * plain string to match the codebase-wide string identity convention.
 */
const getAccountIdForUser = async (user) =>
  String((await getPrimaryAccountForUser(user))._id);

/**
 * Express middleware: resolve and attach req.entitlements, req.account, and
 * req.accountId (the active tenant). Never blocks the request by itself.
 */
const attachEntitlements = () => async (req, res, next) => {
  try {
    const { entitlements, account } = await getEntitlementsForUser(req.user);
    req.entitlements = entitlements;
    req.account = account;
    req.accountId = account?.id || null;
    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * Express middleware: require a feature flag from the resolved entitlements.
 * Responds 402 with a stable code so the frontend can render an upgrade
 * prompt instead of a generic error.
 */
const requireFeature = (feature) => async (req, res, next) => {
  try {
    if (!req.entitlements) {
      const { entitlements, account } = await getEntitlementsForUser(req.user);
      req.entitlements = entitlements;
      req.account = account;
    }
    if (req.entitlements.features[feature]) {
      return next();
    }
    const error = createHttpError(
      402,
      'This AI capability is part of the Pro and Team plans. Ask your administrator for an upgrade.'
    );
    error.code = 'UPGRADE_REQUIRED';
    error.feature = feature;
    return next(error);
  } catch (error) {
    return next(error);
  }
};

const requireSuperAdmin = () => async (req, res, next) => {
  if (isSuperAdminUser(req.user)) return next();
  return next(createHttpError(403, 'Super admin access required'));
};

module.exports = {
  isSuperAdminUser,
  accountToDto,
  getPrimaryAccountForUser,
  getAccountIdForUser,
  getEntitlementsForUser,
  setPlanForUser,
  addMemberToAccount,
  removeMemberFromAccount,
  attachEntitlements,
  requireFeature,
  requireSuperAdmin,
  seatsUsed
};
