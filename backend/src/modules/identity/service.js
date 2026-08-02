const User = require('./models/User');

/**
 * Cross-module access interface for the identity domain. Other modules depend
 * on this instead of importing the User model directly, mirroring
 * documents/service.js.
 */
const findUserByEmail = (email) =>
  User.findOne({ email: String(email || '').toLowerCase() })
    .select('name email platformRole createdAt')
    .lean();

const findUserById = (userId) =>
  User.findById(userId).select('name email platformRole createdAt').lean();

const searchUsersByTerm = ({ term, limit = 20, excludeUserId }) => {
  const regex = new RegExp(String(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const filter = { $or: [{ email: regex }, { name: regex }] };
  if (excludeUserId) filter._id = { $ne: excludeUserId };
  return User.find(filter)
    .select('name email platformRole createdAt')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

module.exports = { findUserByEmail, findUserById, searchUsersByTerm };
