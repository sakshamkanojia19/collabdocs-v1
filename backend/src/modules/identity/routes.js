const { Router } = require('express');
const { body, query, validationResult } = require('express-validator');
const createHttpError = require('http-errors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {
  asyncHandler,
  formatValidationErrors,
  authenticateRequest
} = require('@collabdocs/shared');
const User = require('./models/User');
const {
  getEntitlementsForUser,
  getPrimaryAccountForUser,
  isSuperAdminUser
} = require('../accounts/service');

const router = Router();

/**
 * Plan/entitlement context shipped with every auth response so the client can
 * gate paid AI features without a second round trip. Never fails the auth
 * call: entitlement resolution errors degrade to the free tier.
 */
const buildPlanContext = async (user) => {
  try {
    return await getEntitlementsForUser({
      id: user.id || String(user._id),
      name: user.name,
      email: user.email,
      platformRole: user.platformRole
    });
  } catch (error) {
    return { account: null, entitlements: null };
  }
};

const getJwtSecret = () => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET is not defined');
  }
  return secret;
};

const buildTokenPayload = (user) => ({
  sub: user.id,
  name: user.name,
  email: user.email
});

const generateAccessToken = (user) =>
  jwt.sign(
    buildTokenPayload(user),
    getJwtSecret(),
    {
      expiresIn: process.env.AUTH_TOKEN_TTL || '15m'
    }
  );

const authenticate = authenticateRequest();

router.get(
  '/status',
  (req, res) => {
    res.json({
      service: 'auth-service',
      message: 'Auth service operational',
      timestamp: new Date().toISOString()
    });
  }
);

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        errors: formatValidationErrors(errors.array())
      });
    }

    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw createHttpError(409, 'Email is already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword
    });

    const token = generateAccessToken(user);
    const { account, entitlements } = await buildPlanContext(user);

    res.status(201).json({
      success: true,
      data: {
        user: user.toSafeObject(),
        token,
        account,
        entitlements
      }
    });
  })
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        errors: formatValidationErrors(errors.array())
      });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      throw createHttpError(401, 'Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw createHttpError(401, 'Invalid credentials');
    }

    const token = generateAccessToken(user);
    const { account, entitlements } = await buildPlanContext(user);

    res.json({
      success: true,
      data: {
        user: user.toSafeObject(),
        token,
        account,
        entitlements
      }
    });
  })
);

router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Valid email is required').normalizeEmail()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        errors: formatValidationErrors(errors.array())
      });
    }

    const user = await User.findOne({ email: req.body.email.toLowerCase() });
    let resetToken;

    if (user) {
      resetToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      user.resetPasswordExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
      await user.save();

      // Production deployments should deliver resetToken through the configured
      // transactional-email provider. It is returned only for local development.
    }

    res.json({
      success: true,
      message: 'If the account exists, a password reset link has been requested.',
      data:
        process.env.NODE_ENV !== 'production' && resetToken
          ? { resetToken }
          : undefined
    });
  })
);

router.post(
  '/reset-password',
  [
    body('token').isString().notEmpty().withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/[a-z]/)
      .withMessage('Password must include a lowercase letter')
      .matches(/[A-Z]/)
      .withMessage('Password must include an uppercase letter')
      .matches(/[^a-zA-Z]/)
      .withMessage('Password must include a number or symbol')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        errors: formatValidationErrors(errors.array())
      });
    }

    const tokenHash = crypto.createHash('sha256').update(req.body.token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpiresAt: { $gt: new Date() }
    }).select('+password +resetPasswordToken +resetPasswordExpiresAt');

    if (!user) {
      throw createHttpError(400, 'This password reset link is invalid or expired');
    }

    user.password = await bcrypt.hash(req.body.password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  })
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) {
      throw createHttpError(404, 'User not found');
    }

    const { account, entitlements } = await buildPlanContext(user);

    res.json({
      success: true,
      data: {
        user: user.toSafeObject(),
        account,
        entitlements
      }
    });
  })
);

router.get(
  '/users/search',
  authenticate,
  [
    query('query')
      .trim()
      .notEmpty()
      .withMessage('Search query is required'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 25 })
      .withMessage('Limit must be between 1 and 25')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        errors: formatValidationErrors(errors.array())
      });
    }

    const searchTerm = req.query.query;
    const limit = Number(req.query.limit) || 10;
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const filter = {
      _id: { $ne: req.user.id },
      $or: [{ email: regex }, { name: regex }]
    };

    // People discovery is tenant-scoped: sharing and chat can only find
    // members of the caller's own organization. Onboarding someone happens
    // through Settings -> Plan & members first. Super admins keep global
    // search for administration.
    if (!isSuperAdminUser(req.user)) {
      const account = await getPrimaryAccountForUser(req.user);
      const orgMemberIds = [
        String(account.owner.userId),
        ...(account.members || []).map((member) => String(member.userId))
      ].filter((id) => id !== String(req.user.id));
      filter._id = { $in: orgMemberIds };
    }

    const users = await User.find(filter)
      .select('name email createdAt updatedAt')
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: {
        users
      }
    });
  })
);

module.exports = router;

