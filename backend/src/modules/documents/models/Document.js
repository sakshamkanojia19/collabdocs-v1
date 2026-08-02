const { Schema, model } = require('mongoose');

const collaboratorSchema = new Schema(
  {
    userId: {
      type: String,
      required: true
    },
    name: {
      type: String
    },
    email: {
      type: String
    },
    role: {
      type: String,
      enum: ['owner', 'editor', 'viewer'],
      default: 'editor'
    }
  },
  {
    _id: false
  }
);

const documentSchema = new Schema(
  {
    // Tenant boundary: the account (organization) this document belongs to.
    // Stamped at creation from the creator's active account; the string form
    // matches the codebase-wide string identity convention.
    accountId: {
      type: String,
      default: null,
      index: true
    },
    // 'private'  — visible only to owner + collaborators (ACL, unchanged).
    // 'workspace' — additionally readable by every member of the account.
    visibility: {
      type: String,
      enum: ['private', 'workspace'],
      default: 'private',
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 240
    },
    content: {
      type: Schema.Types.Mixed,
      default: { ops: [{ insert: '' }] }
    },
    contentText: {
      type: String,
      default: ''
    },
    owner: {
      type: collaboratorSchema,
      required: true
    },
    collaborators: {
      type: [collaboratorSchema],
      default: []
    },
    tags: {
      type: [String],
      default: []
    },
    lastEditedBy: {
      type: collaboratorSchema,
      default: null
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

documentSchema.index(
  {
    title: 'text',
    contentText: 'text',
    tags: 'text'
  },
  {
    name: 'document_text_search'
  }
);

documentSchema.methods.toResponse = function toResponse() {
  const obj = this.toObject({ versionKey: false });
  delete obj.contentText;
  return obj;
};

module.exports = model('Document', documentSchema);
