const { Schema, model, Types } = require('mongoose');

const chatNotificationSchema = new Schema(
  {
    accountId: {
      type: String,
      default: null,
      index: true
    },
    userId: {
      type: String,
      required: true,
      index: true
    },
    groupId: {
      type: Types.ObjectId,
      ref: 'ChatGroup',
      required: true,
      index: true
    },
    groupName: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: [
        'group-invite',
        'participant-added',
        'participant-removed',
        'mention',
        'decision'
      ],
      default: 'group-invite'
    },
    status: {
      type: String,
      enum: ['pending', 'read'],
      default: 'pending'
    },
    initiator: {
      userId: String,
      name: String,
      email: String
    },
    metadata: {
      type: Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
);

chatNotificationSchema.index({ userId: 1, status: 1, createdAt: -1 });

module.exports = model('ChatNotification', chatNotificationSchema);
