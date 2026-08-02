const { Schema, model } = require('mongoose');

const documentChunkSchema = new Schema(
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
      required: true,
      index: true
    },
    embeddingModel: {
      type: String,
      required: true
    },
    chunkIndex: {
      type: Number,
      required: true,
      min: 0
    },
    text: {
      type: String,
      required: true
    },
    embedding: {
      type: [Number],
      required: true,
      select: true
    }
  },
  {
    timestamps: true
  }
);

documentChunkSchema.index(
  { documentId: 1, checksum: 1, embeddingModel: 1, chunkIndex: 1 },
  { unique: true, name: 'document_chunk_revision' }
);

module.exports = model('DocumentChunk', documentChunkSchema);
