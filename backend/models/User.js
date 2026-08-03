const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
      trim: true,
    },

    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    password: {
      type: String,
      required() {
        return this.authProvider === "local";
      },
      select: false,
    },

    wallet: {
      type: Number,
      default: 0,
      min: 0,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true,
    },

    suspended: {
      type: Boolean,
      default: false,
      index: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    verificationCodeHash: {
      type: String,
      default: null,
      select: false,
    },

    verificationExpires: {
      type: Date,
      default: null,
      select: false,
    },

    passwordResetCodeHash: {
      type: String,
      default: null,
      select: false,
    },

    passwordResetExpires: {
      type: Date,
      default: null,
      select: false,
    },

    apiKey: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
      select: false,
    },

    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("User", userSchema);