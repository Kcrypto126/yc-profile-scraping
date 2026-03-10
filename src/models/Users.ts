import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  name: String,

  // Auth (password-only). We keep legacy `password` for backwards compatibility/migration,
  // but new installs should use passwordSalt/passwordHash/passwordIterations.
  password: String,
  passwordSalt: String,
  passwordHash: String,
  passwordIterations: Number,

  // Existing fields (unrelated to app login)
  ssoKey: String,
  susSession: String,
  date: {
    type: Date,
    default: Date.now(),
  },
  enabled: {
    type: Boolean,
    default: false,
  },
  role: {
    type: String,
    enum: ["admin", "user"],
    default: "user",
  },
});

export const User = mongoose.models.User || mongoose.model("User", UserSchema);
