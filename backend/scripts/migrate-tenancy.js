/**
 * One-time tenancy backfill.
 *
 * Ensures every user owns a (free) Account, then stamps accountId onto every
 * pre-tenancy row, deriving the tenant from the resource's creator:
 *   Document            ← owner's account (+ visibility: 'private')
 *   Notification        ← its document's account
 *   ChatGroup           ← creator's account
 *   ChatMessage         ← its group's account
 *   ChatNotification    ← its group's account
 *   AIArtifact/Chunk    ← its document's account
 *   ActionItem          ← its document's account
 *
 * Idempotent: only rows with accountId null/missing are touched.
 *
 * Usage:  node scripts/migrate-tenancy.js
 */
const mongoose = require('mongoose');
const { config } = require('../src/platform/config');

const User = require('../src/modules/identity/models/User');
const Account = require('../src/modules/accounts/models/Account');
const Document = require('../src/modules/documents/models/Document');
const Notification = require('../src/modules/documents/models/Notification');
const ChatGroup = require('../src/modules/chat/models/ChatGroup');
const ChatMessage = require('../src/modules/chat/models/ChatMessage');
const ChatNotification = require('../src/modules/chat/models/ChatNotification');
const AIArtifact = require('../src/modules/ai/models/AIArtifact');
const DocumentChunk = require('../src/modules/ai/models/DocumentChunk');
const ActionItem = require('../src/modules/ai/models/ActionItem');

const MISSING = { $in: [null, undefined] };

const run = async () => {
  await mongoose.connect(config.mongoUri, { maxPoolSize: config.mongoMaxPoolSize });
  console.log('Connected to MongoDB');

  // 1. Every user owns an account. Existing owned accounts are kept as-is.
  const users = await User.find().select('name email').lean();
  const accountsByOwner = new Map(
    (await Account.find().select('owner.userId').lean()).map((account) => [
      String(account.owner.userId),
      String(account._id)
    ])
  );

  let createdAccounts = 0;
  for (const user of users) {
    const ownerId = String(user._id);
    if (!accountsByOwner.has(ownerId)) {
      const account = await Account.create({
        name: `${user.name || 'Personal'}'s workspace`,
        plan: 'free',
        seats: 1,
        owner: { userId: user._id, name: user.name, email: user.email }
      });
      accountsByOwner.set(ownerId, String(account._id));
      createdAccounts += 1;
    }
  }
  console.log(`Accounts: ${createdAccounts} created, ${accountsByOwner.size} total`);

  // 2. Documents ← owner's account.
  const documents = await Document.find({ accountId: MISSING })
    .select('owner.userId')
    .lean();
  if (documents.length) {
    await Document.bulkWrite(
      documents
        .filter((doc) => accountsByOwner.has(String(doc.owner?.userId)))
        .map((doc) => ({
          updateOne: {
            filter: { _id: doc._id },
            update: {
              $set: {
                accountId: accountsByOwner.get(String(doc.owner.userId)),
                visibility: 'private'
              }
            }
          }
        }))
    );
  }
  console.log(`Documents stamped: ${documents.length}`);

  // Tenant lookup for document-derived rows (covers already-stamped docs too).
  const accountByDocument = new Map(
    (await Document.find().select('accountId').lean()).map((doc) => [
      String(doc._id),
      doc.accountId || null
    ])
  );

  const stampByParent = async (Model, parentField, parentMap, label) => {
    const rows = await Model.find({ accountId: MISSING }).select(parentField).lean();
    const ops = rows
      .map((row) => {
        const parentId = String(row[parentField] || '');
        const accountId = parentMap.get(parentId);
        return accountId
          ? {
              updateOne: {
                filter: { _id: row._id },
                update: { $set: { accountId } }
              }
            }
          : null;
      })
      .filter(Boolean);
    if (ops.length) await Model.bulkWrite(ops);
    console.log(`${label} stamped: ${ops.length}/${rows.length}`);
  };

  // 3. ChatGroups ← creator's account.
  const groups = await ChatGroup.find({ accountId: MISSING })
    .select('createdBy.userId participants')
    .lean();
  if (groups.length) {
    await ChatGroup.bulkWrite(
      groups
        .map((group) => {
          const creatorId = String(
            group.createdBy?.userId ||
              group.participants?.find((participant) => participant.role === 'owner')?.userId ||
              ''
          );
          const accountId = accountsByOwner.get(creatorId);
          return accountId
            ? {
                updateOne: {
                  filter: { _id: group._id },
                  update: { $set: { accountId } }
                }
              }
            : null;
        })
        .filter(Boolean)
    );
  }
  console.log(`Chat groups stamped: ${groups.length}`);

  const accountByGroup = new Map(
    (await ChatGroup.find().select('accountId').lean()).map((group) => [
      String(group._id),
      group.accountId || null
    ])
  );

  // 4. Children inherit their parent's tenant.
  await stampByParent(ChatMessage, 'groupId', accountByGroup, 'Chat messages');
  await stampByParent(ChatNotification, 'groupId', accountByGroup, 'Chat notifications');
  await stampByParent(Notification, 'documentId', accountByDocument, 'Document notifications');
  await stampByParent(AIArtifact, 'documentId', accountByDocument, 'AI artifacts');
  await stampByParent(DocumentChunk, 'documentId', accountByDocument, 'Document chunks');
  await stampByParent(ActionItem, 'documentId', accountByDocument, 'Action items');

  await mongoose.disconnect();
  console.log('Tenancy backfill complete.');
};

run().catch((error) => {
  console.error('Tenancy backfill failed:', error);
  process.exitCode = 1;
});
