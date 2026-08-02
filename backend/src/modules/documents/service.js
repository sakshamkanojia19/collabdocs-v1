const createHttpError = require('http-errors');
const Document = require('./models/Document');
const { getDocumentRole, userHasWriteAccess } = require('./policy');

/**
 * Cross-module access interface for the documents domain. Other modules depend on
 * this instead of importing the Document model, so authorization stays in one place.
 *
 * Tenancy: every reader accepts the caller's active `accountId`. The tenant
 * branch only ever WIDENS read access to workspace-visible documents of the
 * same account — omitting it degrades to the stricter ACL-only behavior, so a
 * missed accountId can never leak another tenant's data.
 */

const accessFilterForUser = (userId, accountId = null) => ({
  isArchived: false,
  $or: [
    { 'owner.userId': userId },
    { collaborators: { $elemMatch: { userId } } },
    ...(accountId
      ? [{ accountId: String(accountId), visibility: 'workspace' }]
      : [])
  ]
});

const loadDocumentForUser = async (
  documentId,
  userId,
  { requireWrite = false, accountId = null } = {}
) => {
  const document = await Document.findById(documentId);
  if (!document || document.isArchived) {
    throw createHttpError(404, 'Document not found');
  }
  const role = getDocumentRole(document, userId, accountId);
  if (!role) {
    throw createHttpError(403, 'You do not have access to this document');
  }
  if (requireWrite && !userHasWriteAccess(document, userId)) {
    throw createHttpError(403, 'You need edit access to this document');
  }
  return { document, role };
};

const listReadableDocumentIds = async (userId, accountId = null) => {
  const documents = await Document.find(accessFilterForUser(userId, accountId))
    .select('_id')
    .lean();
  return documents.map((document) => document._id);
};

const listReadableDocuments = async (
  userId,
  { fields = 'title updatedAt owner collaborators', accountId = null } = {}
) => Document.find(accessFilterForUser(userId, accountId)).select(fields).lean();

const getDocumentTitles = async (documentIds, userId, accountId = null) => {
  const documents = await Document.find({
    _id: { $in: documentIds },
    ...accessFilterForUser(userId, accountId)
  })
    .select('title updatedAt owner collaborators')
    .lean();
  return new Map(documents.map((document) => [String(document._id), document]));
};

module.exports = {
  accessFilterForUser,
  loadDocumentForUser,
  listReadableDocumentIds,
  listReadableDocuments,
  getDocumentTitles
};
