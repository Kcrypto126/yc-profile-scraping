import mongoose from "mongoose";

const ScrapeAgainJobSchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true, default: "current" },
  running: { type: Boolean, required: true, default: false },
  scraped: { type: Number, required: true, default: 0 },
  failed: { type: Number, required: true, default: 0 },
  total: { type: Number, required: true, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});

export const ScrapeAgainJob =
  mongoose.models.ScrapeAgainJob ||
  mongoose.model("ScrapeAgainJob", ScrapeAgainJobSchema);

const JOB_ID = "current";

export type ScrapeAgainJobState = {
  running: boolean;
  scraped: number;
  failed: number;
  total: number;
};

const DEFAULT_STATE: ScrapeAgainJobState = {
  running: false,
  scraped: 0,
  failed: 0,
  total: 0,
};

export async function getScrapeAgainJob(): Promise<ScrapeAgainJobState> {
  const doc = await ScrapeAgainJob.findOne({ jobId: JOB_ID }).lean().exec();
  if (!doc) return DEFAULT_STATE;
  return {
    running: doc.running,
    scraped: doc.scraped,
    failed: doc.failed,
    total: doc.total,
  };
}

export async function setScrapeAgainJob(state: ScrapeAgainJobState): Promise<void> {
  await ScrapeAgainJob.findOneAndUpdate(
    { jobId: JOB_ID },
    { $set: { ...state, updatedAt: new Date() } },
    { upsert: true },
  ).exec();
}
