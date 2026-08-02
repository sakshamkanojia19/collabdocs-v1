const { Schema, model, Types } = require('mongoose');

const attachmentSchema = new Schema(
  {
    name: String,
    url: String,
    mimeType: String,
    size: Number
  },
  { _id: false }
);

const reactionSchema = new Schema(
  {
    emoji: {
      type: String,
      required: true,
      maxlength: 8
    },
    userIds: {
      type: [String],
      default: []
    }
  },
  { _id: false }
);

const mentionSchema = new Schema(
  {
    userId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    }
  },
  { _id: false }
);

const replyToSchema = new Schema(
  {
    messageId: {
      type: Types.ObjectId,
      ref: 'ChatMessage'
    },
    senderName: String,
    preview: {
      type: String,
      maxlength: 200
    }
  },
  { _id: false }
);

// Anchors bind a message to a specific text range of a document so the discussion
// stays attached to the work that produced it.
const anchorSchema = new Schema(
  {
    documentId: {
      type: Types.ObjectId,
      ref: 'Document',
      required: true
    },
    quote: {
      type: String,
      required: true,
      maxlength: 600
    },
    blockIndex: {
      type: Number,
      min: 0
    },
    startOffset: {
      type: Number,
      min: 0
    },
    endOffset: {
      type: Number,
      min: 0
    },
    resolvedAt: Date,
    resolvedBy: {
      userId: String,
      name: String
    }
  },
  { _id: false }
);

// A message promoted to a decision becomes part of the document's durable decision
// log: who decided, when, and the discussion it came from.
const decisionSchema = new Schema(
  {
    summary: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300
    },
    markedAt: {
      type: Date,
      default: Date.now
    },
    markedBy: {
      userId: String,
      name: String
    },
    documentId: {
      type: Types.ObjectId,
      ref: 'Document'
    }
  },
  { _id: false }
);

const chatMessageSchema = new Schema(
  {
    accountId: {
      type: String,
      default: null,
      index: true
    },
    groupId: {
      type: Types.ObjectId,
      ref: 'ChatGroup',
      required: true,
      index: true
    },
    sender: {
      userId: {
        type: String,
        required: true
      },
      name: {
        type: String,
        required: true
      },
      email: {
        type: String,
        required: true
      },
      avatarColor: {
        type: String
      }
    },
    content: {
      type: String,
      trim: true,
      maxlength: 4000
    },
    type: {
      type: String,
      enum: ['text', 'system'],
      default: 'text'
    },
    attachments: [attachmentSchema],
    reactions: {
      type: [reactionSchema],
      default: []
    },
    mentions: {
      type: [mentionSchema],
      default: []
    },
    replyTo: replyToSchema,
    anchor: anchorSchema,
    decision: decisionSchema,
    editedAt: Date,
    deletedAt: Date,
    metadata: {
      type: Schema.Types.Mixed
    },
    deliveredTo: {
      type: [String],
      default: []
    },
    readBy: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

chatMessageSchema.index({ groupId: 1, createdAt: -1 });
chatMessageSchema.index({ 'sender.userId': 1, createdAt: -1 });
chatMessageSchema.index({ 'anchor.documentId': 1, createdAt: -1 });
chatMessageSchema.index({ 'decision.documentId': 1, 'decision.markedAt': -1 });
chatMessageSchema.index({ 'mentions.userId': 1, createdAt: -1 });

chatMessageSchema.methods.toDto = function toDto(currentUserId) {
  const isDeleted = Boolean(this.deletedAt);
  return {
    id: this._id?.toString(),
    groupId: this.groupId?.toString(),
    sender: this.sender,
    content: isDeleted ? '' : this.content,
    type: this.type,
    attachments: isDeleted ? [] : this.attachments || [],
    reactions: isDeleted
      ? []
      : (this.reactions || []).map((reaction) => ({
          emoji: reaction.emoji,
          count: reaction.userIds.length,
          // userIds let broadcast recipients derive their own "reacted" state from a
          // single shared payload; membership is already visible to the group.
          userIds: reaction.userIds,
          reacted: reaction.userIds.includes(currentUserId)
        })),
    mentions: this.mentions || [],
    replyTo: this.replyTo
      ? {
          messageId: this.replyTo.messageId?.toString(),
          senderName: this.replyTo.senderName,
          preview: this.replyTo.preview
        }
      : null,
    anchor: this.anchor
      ? {
          documentId: this.anchor.documentId?.toString(),
          quote: this.anchor.quote,
          blockIndex: this.anchor.blockIndex,
          startOffset: this.anchor.startOffset,
          endOffset: this.anchor.endOffset,
          resolvedAt: this.anchor.resolvedAt,
          resolvedBy: this.anchor.resolvedBy
        }
      : null,
    decision: this.decision
      ? {
          summary: this.decision.summary,
          markedAt: this.decision.markedAt,
          markedBy: this.decision.markedBy,
          documentId: this.decision.documentId?.toString()
        }
      : null,
    metadata: this.metadata || {},
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    editedAt: this.editedAt,
    isDeleted,
    isEdited: Boolean(this.editedAt),
    deliveredTo: this.deliveredTo,
    readBy: this.readBy,
    isOwn: this.sender?.userId === currentUserId,
    mentionsMe: (this.mentions || []).some((mention) => mention.userId === currentUserId)
  };
};

module.exports = model('ChatMessage', chatMessageSchema);
