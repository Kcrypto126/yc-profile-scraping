import mongoose from "mongoose";

const ProfileSchema = new mongoose.Schema({
  userId: String,
  name: String,
  location: String,
  age: {
    type: Number,
    required: false,
    default: null,
  },
  lastSeen: String,
  avatar: String,
  sumary: String,
  intro: String,
  lifeStory: String,
  freeTime: String,
  other: String,
  accomplishments: String,
  education: [String],
  employment: [String],
  startup: {
    name: String,
    description: String,
    progress: String,
    funding: String,
  },
  cofounderPreferences: {
    requirements: [String],
    idealPersonality: String,
    equity: String,
  },
  interests: {
    shared: [String],
    personal: [String],
  },
  linkedIn: String,
  /** From p.css-vqx3x2 first <b>: "technical" -> true, "non-technical" -> false, else null */
  technical: { type: Boolean, default: null, required: false },
  idea: { type: String, enum: ["committed", "potential", "other"], default: "other", required: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: ["default", "active", "pending", "archived"],
    default: "default",
  },
  sentByAccount: {
    type: String,
    default: null,
  },
  sentAt: {
    type: Date,
    default: null,
  },
  sentWithTemplate: {
    type: String,
    default: null,
  },
  visitedAt: {
    type: Date,
    default: null,
  },
  visited: {
    type: Boolean,
    default: false,
    required: false,
  },
  /** Single status: "visited" | "new" | "sent" (legacy; use userStates per user) */
  badge: {
    type: String,
    enum: ["visited", "new", "sent"],
    default: "new",
  },
  /** Per-app-user state: badge, sent, visited (one entry per user who interacted) */
  userStates: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      badge: { type: String, enum: ["visited", "new", "sent"], default: "new" },
      sentAt: { type: Date, default: null },
      sentByAccount: { type: String, default: null },
      sentWithTemplate: { type: String, default: null },
      visitedAt: { type: Date, default: null },
      visited: { type: Boolean, default: false },
    },
  ],
});

export const Profile =
  mongoose.models.Profile || mongoose.model("Profile", ProfileSchema);
