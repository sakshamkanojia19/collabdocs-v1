const { Router } = require('express');
const { body, param, query, validationResult } = require('express-validator');
const createHttpError = require('http-errors');
const { asyncHandler, authenticateRequest } = require('@collabdocs/shared');
const Account = require('./models/Account');
const { PLANS, resolveSeatCapacity } = require('./entitlements');
const { findUserById, searchUsersByTerm } = require('../identity/service');
const {
  getEntitlementsForUser,
  setPlanForUser,
  addMemberToAccount,
  removeMemberFromAccount,
  accountToDto,
  requireSuperAdmin,
  isSuperAdminUser
} = require('./service');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const error = createHttpError(422, 'Validation failed');
  error.errors = errors.array();
  return next(error);
};

/* ------------------------------------------------------------------ */
/* /api/v1/account — the caller's own plan, seats, and members        */
/* ------------------------------------------------------------------ */

const accountRouter = Router();
accountRouter.use(authenticateRequest());

accountRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { account, entitlements } = await getEntitlementsForUser(req.user);
    res.json({ account, entitlements, plans: PLANS });
  })
);

accountRouter.post(
  '/members',
  [body('email').isEmail().withMessage('A valid member email is required').normalizeEmail()],
  handleValidation,
  asyncHandler(async (req, res) => {
    const account = await addMemberToAccount({ owner: req.user, memberEmail: req.body.email });
    res.status(201).json({ account: { ...accountToDto(account, { includeMembers: true }), isOwner: true } });
  })
);

accountRouter.delete(
  '/members/:memberUserId',
  [param('memberUserId').isMongoId().withMessage('Invalid member id')],
  handleValidation,
  asyncHandler(async (req, res) => {
    const account = await removeMemberFromAccount({
      owner: req.user,
      memberUserId: req.params.memberUserId
    });
    res.json({ account: { ...accountToDto(account, { includeMembers: true }), isOwner: true } });
  })
);

/* ------------------------------------------------------------------ */
/* /api/v1/admin — super-admin plan management                        */
/* ------------------------------------------------------------------ */

const adminRouter = Router();
adminRouter.use(authenticateRequest());
adminRouter.use(requireSuperAdmin());

adminRouter.get(
  '/users',
  [
    query('query').optional().trim().isLength({ min: 1, max: 120 }),
    query('limit').optional().isInt({ min: 1, max: 50 })
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const users = await searchUsersByTerm({
      term: req.query.query || '',
      limit: Number(req.query.limit) || 25
    });

    const accounts = await Account.find({
      'owner.userId': { $in: users.map((user) => user._id) }
    }).lean();
    const accountsByOwner = new Map(
      accounts.map((account) => [String(account.owner.userId), account])
    );

    res.json({
      users: users.map((user) => {
        const account = accountsByOwner.get(String(user._id));
        return {
          id: String(user._id),
          name: user.name,
          email: user.email,
          isSuperAdmin: isSuperAdminUser(user),
          plan: account?.plan || 'free',
          seats: resolveSeatCapacity(account?.plan || 'free', account?.seats),
          seatsUsed: account ? (account.members?.length || 0) + 1 : 1,
          createdAt: user.createdAt
        };
      })
    });
  })
);

adminRouter.patch(
  '/users/:userId/plan',
  [
    param('userId').isMongoId().withMessage('Invalid user id'),
    body('plan').isIn(Object.keys(PLANS)).withMessage('Unknown plan'),
    body('seats').optional().isInt({ min: 1, max: 500 }).withMessage('Invalid seat count')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const targetUser = await findUserById(req.params.userId);
    if (!targetUser) {
      throw createHttpError(404, 'User not found');
    }
    const account = await setPlanForUser({
      targetUser,
      plan: req.body.plan,
      seats: req.body.seats,
      actor: req.user
    });
    res.json({ account: accountToDto(account, { includeMembers: true }) });
  })
);

module.exports = { accountRouter, adminRouter };
