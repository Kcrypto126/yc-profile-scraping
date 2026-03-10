/**
 * One-time migration: add "technical" field to all profile documents that don't have it.
 * Run from project root:
 *   node scripts/add-technical-field.js
 *
 * Uses MONGODB_URI from .env if present.
 */

const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  content.split("\n").forEach((line) => {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  });
}

const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/next-scraper";

async function main() {
  await mongoose.connect(MONGODB_URI);
  const coll = mongoose.connection.collection("profiles");
  const result = await coll.updateMany(
    { technical: { $exists: false } },
    { $set: { technical: null } }
  );
  console.log("Added technical: null to", result.modifiedCount, "profile(s).");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
