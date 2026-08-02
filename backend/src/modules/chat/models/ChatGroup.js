const { Schema, model, Types } = require('mongoose');

const participantSchema = new Schema(
  {
    userId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 200
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    lastReadAt: {
      type: Date,
      default: Date.now
    },
    mutedUntil: {
      type: Date
    }
  },
  { _id: false }
);

const chatGroupSchema = new Schema(
  {
    accountId: {
      type: String,
      default: null,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180
    },
    avatarColor: {
      type: String,
      default: '#f472b6'
    },
    createdBy: {
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
      }
    },
    participants: {
      type: [participantSchema],
      validate: {
        validator(participants) {
          return Array.isArray(participants) && participants.length > 0;
        },
        message: 'At least one participant is required'
      }
    },
    context: {
      type: {
        type: String,
        enum: ['global', 'document'],
        default: 'global'
      },
      documentId: {
        type: Types.ObjectId,
        ref: 'Document'
      },
      documentTitle: {
        type: String
      }
    },
    lastMessage: {
      messageId: {
        type: Schema.Types.ObjectId,
        ref: 'ChatMessage'
      },
      preview: String,
      sentAt: Date,
      sender: {
        userId: String,
        name: String
      }
    },
    messageCount: {
      type: Number,
      default: 0
    },
    isArchived: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

chatGroupSchema.index({ 'participants.userId': 1 });
chatGroupSchema.index({ 'context.type': 1, 'context.documentId': 1 });
chatGroupSchema.index({ updatedAt: -1 });

chatGroupSchema.methods.hasParticipant = function hasParticipant(userId) {
  return this.participants.some((participant) => participant.userId === userId);
};

chatGroupSchema.methods.ensureParticipant = function ensureParticipant(participant) {
  if (!participant || !participant.userId) {
    throw new Error('Participant payload missing userId');
  }

  const existing = this.participants.find((item) => item.userId === participant.userId);
  if (existing) {
    Object.assign(existing, participant, {
      joinedAt: existing.joinedAt ?? new Date()
    });
    return this;
  }

  this.participants.push({
    ...participant,
    joinedAt: participant.joinedAt || new Date(),
    lastReadAt: participant.lastReadAt || new Date()
  });

  return this;
};

chatGroupSchema.methods.updateReadReceipt = function updateReadReceipt(userId, timestamp = new Date()) {
  const participant = this.participants.find((item) => item.userId === userId);
  if (participant) {
    participant.lastReadAt = timestamp;
  }
  return this;
};

chatGroupSchema.methods.toSummary = function toSummary(currentUserId) {
  const summary = {
    id: this._id?.toString(),
    name: this.name,
    avatarColor: this.avatarColor,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    context: this.context,
    participantCount: this.participants.length,
    lastMessage: this.lastMessage,
    messageCount: this.messageCount,
    participants: this.participants
  };

  if (summary.context && summary.context.documentId) {
    summary.context = {
      ...summary.context,
      documentId: summary.context.documentId.toString()
    };
  }

  if (currentUserId) {
    const membership = this.participants.find((item) => item.userId === currentUserId);
    if (membership) {
      summary.membership = {
        userId: membership.userId,
        role: membership.role,
        joinedAt: membership.joinedAt,
        lastReadAt: membership.lastReadAt
      };
    }
  }

  return summary;
};

module.exports = model('ChatGroup', chatGroupSchema);
