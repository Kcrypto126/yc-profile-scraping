/**
 * One-time script: assign all existing accounts, templates, and profile
 * badge/sent/visited data to kiranhuxley11@gmail.com.
 *
 * Run from project root:
 *   node scripts/assign-to-kiran.js
 *
 * Uses MONGODB_URI from .env if present; otherwise set it in the shell:
 *   set MONGODB_URI=mongodb://...   (Windows)
 *   MONGODB_URI=mongodb://... node scripts/assign-to-kiran.js   (Unix/Mac)
 */

const fs = require("fs");
const path = require("path");

// Load .env from project root so MONGODB_URI is set when running node scripts/assign-to-kiran.js
const envPath = path.resolve(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  content.split("\n").forEach((line) => {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  });
}

const mongoose = require("mongoose");

const OWNER_EMAIL = "kiranhuxley11@gmail.com";
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/next-scraper";

async function main() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const users = db.collection("users");
  const accounts = db.collection("accounts");
  const templates = db.collection("templates");
  const profiles = db.collection("profiles");

  const owner = await users.findOne({ email: OWNER_EMAIL.toLowerCase().trim() });
  if (!owner) {
    console.error("User not found with email:", OWNER_EMAIL);
    process.exit(1);
  }
  const ownerId = owner._id;
  console.log("Owner user id:", ownerId.toString());

  const accountsResult = await accounts.updateMany({}, { $set: { userId: ownerId } });
  console.log("Accounts: matched", accountsResult.matchedCount, "updated", accountsResult.modifiedCount);

  const templatesResult = await templates.updateMany({}, { $set: { userId: ownerId } });
  console.log("Templates: matched", templatesResult.matchedCount, "updated", templatesResult.modifiedCount);

  const cursor = profiles.find({
    $or: [
      { sentAt: { $exists: true, $ne: null } },
      { sentByAccount: { $exists: true, $nin: [null, ""] } },
      { badge: { $in: ["sent", "visited", "new"] } },
      { visitedAt: { $exists: true, $ne: null } },
    ],
  });

  let profilesUpdated = 0;
  while (await cursor.hasNext()) {
    const p = await cursor.next();
    if (!p) continue;
    const hasOwner = (p.userStates || []).some(
      (s) => s.userId && s.userId.toString() === ownerId.toString()
    );
    if (hasOwner) continue;

    const state = {
      userId: ownerId,
      badge: p.badge || "new",
      sentAt: p.sentAt ?? null,
      sentByAccount: p.sentByAccount ?? null,
      sentWithTemplate: p.sentWithTemplate ?? null,
      visitedAt: p.visitedAt ?? null,
      visited: p.visited ?? false,
    };

    await profiles.updateOne(
      { _id: p._id },
      { $push: { userStates: state } }
    );
    profilesUpdated++;
  }

  console.log("Profiles: added owner state to", profilesUpdated, "profiles");
  console.log("Done. All existing accounts, templates, and badge/sent/visited are now for", OWNER_EMAIL);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
