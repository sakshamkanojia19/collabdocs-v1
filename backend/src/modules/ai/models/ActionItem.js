const { Schema, model, Types } = require('mongoose');

const personSchema = new Schema(
  {
    userId: String,
    name: String,
    email: String
  },
  { _id: false }
);

/**
 * Work extracted from a document (or promoted from a conversation) and tracked to
 * completion. Every item keeps a link back to the evidence that produced it, so the
 * document and the work stay connected.
 */
const actionItemSchema = new Schema(
  {
    accountId: {
      type: String,
      default: null,
      index: true
    },
    documentId: {
      type: Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true
    },
    task: {
      type: String,
      required: true,
      trim: true,
      maxlength: 400
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'done', 'dismissed'],
      default: 'open'
    },
    assignee: personSchema,
    // The owner text the extractor found, kept even when nobody is assigned yet.
    suggestedOwner: {
      type: String,
      maxlength: 120
    },
    dueDate: {
      type: String,
      maxlength: 80
    },
    source: {
      type: String,
      enum: ['summary', 'chat', 'manual'],
      default: 'summary'
    },
    // Stable identity for extracted work so re-running extraction updates rather
    // than duplicates an item.
    fingerprint: {
      type: String,
      required: true
    },
    evidence: {
      quote: { type: String, maxlength: 600 },
      messageId: { type: Types.ObjectId, ref: 'ChatMessage' },
      groupId: { type: Types.ObjectId, ref: 'ChatGroup' }
    },
    createdBy: personSchema,
    completedAt: Date,
    completedBy: personSchema
  },
  { timestamps: true }
);

actionItemSchema.index({ documentId: 1, fingerprint: 1 }, { unique: true });
actionItemSchema.index({ 'assignee.userId': 1, status: 1, updatedAt: -1 });
actionItemSchema.index({ status: 1, updatedAt: -1 });

actionItemSchema.methods.toDto = function toDto() {
  return {
    id: this._id?.toString(),
    documentId: this.documentId?.toString(),
    task: this.task,
    status: this.status,
    assignee: this.assignee || null,
    suggestedOwner: this.suggestedOwner || null,
    dueDate: this.dueDate || null,
    source: this.source,
    evidence: this.evidence
      ? {
          quote: this.evidence.quote || null,
          messageId: this.evidence.messageId?.toString() || null,
          groupId: this.evidence.groupId?.toString() || null
        }
      : null,
    createdBy: this.createdBy || null,
    completedAt: this.completedAt || null,
    completedBy: this.completedBy || null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = model('ActionItem', actionItemSchema);
