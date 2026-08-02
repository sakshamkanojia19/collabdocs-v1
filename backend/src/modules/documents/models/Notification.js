const { Schema, model } = require('mongoose');

const notificationSchema = new Schema(
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
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true
    },
    documentTitle: {
      type: String,
      required: true
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
      }
    },
    role: {
      type: String,
      enum: ['viewer', 'editor'],
      required: true
    },
    type: {
      type: String,
      enum: ['share'],
      default: 'share'
    },
    status: {
      type: String,
      enum: ['pending', 'read'],
      default: 'pending'
    },
    metadata: {
      type: Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
);

module.exports = model('Notification', notificationSchema);
