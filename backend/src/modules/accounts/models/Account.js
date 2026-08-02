const { Schema, model } = require('mongoose');

const identitySnapshotSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, trim: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true, maxlength: 160 }
  },
  { _id: false }
);

const memberSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, trim: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true, maxlength: 160 },
    addedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

/**
 * A billing account. Every user lazily receives a personal free account they
 * own; paid plans are granted by a super admin (no payment processor yet).
 * Team accounts hold seat members who inherit the account's entitlements.
 */
const accountSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    plan: {
      type: String,
      enum: ['free', 'pro', 'team'],
      default: 'free',
      index: true
    },
    seats: { type: Number, default: 1, min: 1 },
    owner: { type: identitySnapshotSchema, required: true },
    members: { type: [memberSchema], default: [] },
    planUpdatedAt: { type: Date },
    planUpdatedBy: { type: identitySnapshotSchema }
  },
  { timestamps: true }
);

accountSchema.index({ 'owner.userId': 1 }, { unique: true });
accountSchema.index({ 'members.userId': 1 });

module.exports = model('Account', accountSchema);
