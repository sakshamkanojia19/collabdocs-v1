const crypto = require('crypto');
const createHttpError = require('http-errors');
const ActionItem = require('./models/ActionItem');
const AIArtifact = require('./models/AIArtifact');
const { listReadableDocumentIds } = require('../documents/service');

const OPEN_STATUSES = ['open', 'in_progress'];

/**
 * Extracted tasks have no natural id, so identity comes from the normalised task
 * text. Re-running extraction then updates an item instead of duplicating it, and
 * a user's status/assignee edits survive regeneration.
 */
const fingerprintOf = (task) =>
  crypto
    .createHash('sha1')
    .update(String(task).toLowerCase().replace(/\s+/g, ' ').trim())
    .digest('hex');

/**
 * Promotes the action items already produced by the summary engine into tracked
 * work. Existing items keep their status, assignee, and due date.
 */
const syncFromSummary = async ({ document, user }) => {
  const summary = await AIArtifact.findOne({
    documentId: document._id,
    type: 'summary'
  })
    .sort({ updatedAt: -1 })
    .lean();

  const extracted = summary?.payload?.actionItems || [];
  if (extracted.length === 0) {
    return { created: 0, updated: 0, items: await listForDocument(document._id) };
  }

  const operations = extracted
    .filter((item) => item?.task && String(item.task).trim().length > 2)
    .map((item) => {
      const task = String(item.task).trim().slice(0, 400);
      return {
        updateOne: {
          filter: { documentId: document._id, fingerprint: fingerprintOf(task) },
          update: {
            $set: {
              task,
              suggestedOwner: item.owner ? String(item.owner).slice(0, 120) : null,
              dueDate: item.dueDate ? String(item.dueDate).slice(0, 80) : null
            },
            // Status, assignee, and provenance are only written on insert so a
            // regenerated summary never resets work already in progress.
            $setOnInsert: {
              documentId: document._id,
              accountId: document.accountId || null,
              fingerprint: fingerprintOf(task),
              status: 'open',
              source: 'summary',
              createdBy: { userId: user.id, name: user.name, email: user.email }
            }
          },
          upsert: true
        }
      };
    });

  if (operations.length === 0) {
    return { created: 0, updated: 0, items: await listForDocument(document._id) };
  }

  const result = await ActionItem.bulkWrite(operations);
  return {
    created: result.upsertedCount || 0,
    updated: result.modifiedCount || 0,
    items: await listForDocument(document._id)
  };
};

const listForDocument = async (documentId) => {
  const items = await ActionItem.find({ documentId }).sort({ status: 1, updatedAt: -1 });
  return items.map((item) => item.toDto());
};

const listForUser = async ({ userId, status = 'open', limit = 100, accountId = null }) => {
  const documentIds = await listReadableDocumentIds(userId, accountId);
  const filter = { documentId: { $in: documentIds } };

  if (status === 'open') {
    filter.status = { $in: OPEN_STATUSES };
  } else if (status !== 'all') {
    filter.status = status;
  }

  const items = await ActionItem.find(filter)
    .sort({ updatedAt: -1 })
    .limit(limit);

  return items.map((item) => item.toDto());
};

const createManualItem = async ({ document, user, task, assignee, dueDate, evidence, source }) => {
  const trimmed = String(task || '').trim();
  if (trimmed.length < 3) {
    throw createHttpError(422, 'Describe the task in at least three characters');
  }

  const fingerprint = fingerprintOf(trimmed);
  const existing = await ActionItem.findOne({ documentId: document._id, fingerprint });
  if (existing) {
    throw createHttpError(409, 'That action item already exists on this document');
  }

  const item = await ActionItem.create({
    documentId: document._id,
    accountId: document.accountId || null,
    task: trimmed.slice(0, 400),
    fingerprint,
    status: 'open',
    source: source || 'manual',
    assignee: assignee || undefined,
    dueDate: dueDate || undefined,
    evidence: evidence || undefined,
    createdBy: { userId: user.id, name: user.name, email: user.email }
  });

  return item.toDto();
};

const updateItem = async ({ itemId, user, changes }) => {
  const item = await ActionItem.findById(itemId);
  if (!item) {
    throw createHttpError(404, 'Action item not found');
  }

  if (changes.task !== undefined) {
    const trimmed = String(changes.task).trim();
    if (trimmed.length < 3) {
      throw createHttpError(422, 'Describe the task in at least three characters');
    }
    item.task = trimmed.slice(0, 400);
    item.fingerprint = fingerprintOf(item.task);
  }

  if (changes.status !== undefined) {
    item.status = changes.status;
    if (changes.status === 'done') {
      item.completedAt = new Date();
      item.completedBy = { userId: user.id, name: user.name, email: user.email };
    } else {
      item.completedAt = undefined;
      item.completedBy = undefined;
    }
  }

  if (changes.assignee !== undefined) {
    item.assignee = changes.assignee || undefined;
  }

  if (changes.dueDate !== undefined) {
    item.dueDate = changes.dueDate ? String(changes.dueDate).slice(0, 80) : undefined;
  }

  await item.save();
  return item.toDto();
};

const deleteItem = async (itemId) => {
  const deleted = await ActionItem.findByIdAndDelete(itemId);
  if (!deleted) {
    throw createHttpError(404, 'Action item not found');
  }
};

const getItemDocumentId = async (itemId) => {
  const item = await ActionItem.findById(itemId).select('documentId').lean();
  if (!item) {
    throw createHttpError(404, 'Action item not found');
  }
  return item.documentId;
};

module.exports = {
  fingerprintOf,
  syncFromSummary,
  listForDocument,
  listForUser,
  createManualItem,
  updateItem,
  deleteItem,
  getItemDocumentId
};
