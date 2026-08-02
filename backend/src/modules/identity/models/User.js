const { Schema, model } = require('mongoose');

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 160
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false
    },
    resetPasswordToken: {
      type: String,
      select: false
    },
    resetPasswordExpiresAt: {
      type: Date,
      select: false
    },
    platformRole: {
      type: String,
      enum: ['user', 'super_admin'],
      default: 'user'
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

userSchema.methods.toSafeObject = function toSafeObject() {
  const { password, __v, ...rest } = this.toObject({ virtuals: true });
  return rest;
};

module.exports = model('User', userSchema);
