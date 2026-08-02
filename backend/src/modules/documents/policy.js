const createHttpError = require('http-errors');

/**
 * Document authority. Two layers:
 *  1. ACL — owner + collaborators[] decide the role, exactly as before.
 *  2. Tenant visibility — a document marked visibility:'workspace' is readable
 *     (viewer role) by any member of the same account. Write access is NEVER
 *     granted by tenancy; editing always requires an explicit ACL role.
 *
 * `accountId` is the caller's active account. Passing null simply disables the
 * tenant layer, so every pre-tenancy call site keeps its old, stricter result.
 */
const getDocumentRole = (document, userId, accountId = null) => {
  if (document.owner?.userId === userId) {
    return 'owner';
  }
  const direct = document.collaborators?.find(
    (collaborator) => collaborator.userId === userId
  )?.role;
  if (direct) {
    return direct;
  }
  if (
    document.visibility === 'workspace' &&
    accountId &&
    document.accountId &&
    String(document.accountId) === String(accountId)
  ) {
    return 'viewer';
  }
  return null;
};

const userHasReadAccess = (document, userId, accountId = null) =>
  Boolean(getDocumentRole(document, userId, accountId));

const userHasWriteAccess = (document, userId) =>
  ['owner', 'editor'].includes(getDocumentRole(document, userId));

const requireOwnership = (document, userId) => {
  if (getDocumentRole(document, userId) !== 'owner') {
    throw createHttpError(403, 'Only the document owner can manage collaborators');
  }
};

module.exports = {
  getDocumentRole,
  userHasReadAccess,
  userHasWriteAccess,
  requireOwnership
};
