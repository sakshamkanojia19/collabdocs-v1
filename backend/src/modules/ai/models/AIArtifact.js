const { Schema, model } = require('mongoose');

const aiArtifactSchema = new Schema(
  {
    accountId: {
      type: String,
      default: null,
      index: true
    },
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true
    },
    checksum: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['summary', 'mind_map'],
      required: true
    },
    model: {
      type: String,
      required: true
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true
    },
    createdBy: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

aiArtifactSchema.index(
  { documentId: 1, checksum: 1, type: 1, model: 1 },
  { unique: true, name: 'document_ai_artifact_revision' }
);

module.exports = model('AIArtifact', aiArtifactSchema);
