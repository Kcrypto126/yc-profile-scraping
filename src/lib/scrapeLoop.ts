import * as cheerio from "cheerio";
import playwright from "playwright";
import { Profile } from "@/models/Profile";
import { buildProfileFromCheerio, MAIN_SELECTOR } from "@/lib/parseProfilePage";

const CANDIDATE_BASE_URL =
  "https://www.startupschool.org/cofounder-matching/candidate";

export { MAIN_SELECTOR, CANDIDATE_BASE_URL };

const ABORT_CHECK_MS = 1500;

/** Race a promise against a periodic abort check so we stop during long operations (e.g. page.goto). */
async function withAbortCheck<T>(
  p: Promise<T>,
  signal: AbortSignal | undefined,
  shouldAbort?: () => Promise<boolean>
): Promise<T> {
  if (!signal && !shouldAbort) return p;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  const abortPromise = new Promise<never>((_, reject) => {
    intervalId = setInterval(async () => {
      if (signal?.aborted) {
        if (intervalId) clearInterval(intervalId);
        reject(new Error("ABORT"));
      } else if (shouldAbort && (await shouldAbort())) {
        if (intervalId) clearInterval(intervalId);
        reject(new Error("ABORT"));
      }
    }, ABORT_CHECK_MS);
  });
  try {
    const result = await Promise.race([p, abortPromise]);
    if (intervalId) clearInterval(intervalId);
    return result as T;
  } catch (e) {
    if (intervalId) clearInterval(intervalId);
    throw e;
  }
}

export async function runScrapeLoop(
  profiles: Array<{ userId?: unknown }>,
  signal: AbortSignal | undefined,
  ssoKey: string,
  susSession: string,
  onProgress?: (scraped: number, failed: number) => void,
  shouldAbort?: () => Promise<boolean>
): Promise<{ ok: true; scraped: number; failed: number; total: number }> {
  const total = profiles.length;
  let scraped = 0;
  let failed = 0;
  const browser = await playwright.chromium.launch();
  try {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: { "Accept-Encoding": "gzip, deflate, br" },
    });
    await context.addCookies([
      { name: "_sso.key", value: ssoKey, domain: ".startupschool.org", path: "/" },
      { name: "_sus_session", value: susSession, domain: ".startupschool.org", path: "/" },
    ]);
    const page = await context.newPage();
    await page.route("**/*.{png,jpg,jpeg,gif,css}", (route) => route.abort());
    await page.route("**/*.{woff,woff2,ttf,otf}", (route) => route.abort());
    await page.route("**/{analytics,tracking,advertisement}/**", (route) => route.abort());

    for (const p of profiles) {
      if (signal?.aborted) break;
      if (shouldAbort && (await shouldAbort())) break;
      const userId = p.userId as string;
      if (!userId) continue;
      const url = `${CANDIDATE_BASE_URL}/${userId}`;
      try {
        await withAbortCheck(
          page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 }),
          signal,
          shouldAbort,
        );
        if (signal?.aborted || (shouldAbort && (await shouldAbort()))) break;
        await withAbortCheck(
          page.waitForSelector(MAIN_SELECTOR, { timeout: 15000, state: "visible" }),
          signal,
          shouldAbort,
        );
        if (signal?.aborted || (shouldAbort && (await shouldAbort()))) break;
        const content = await page.content();
        const $ = cheerio.load(content);
        const mainContent = $(MAIN_SELECTOR);
        const profileData = buildProfileFromCheerio($, mainContent, userId);
        await Profile.findOneAndUpdate(
          { userId },
          { $set: { ...profileData, updatedAt: new Date() }, $setOnInsert: { badge: "new" } },
          { upsert: true },
        );
        scraped++;
      } catch (err) {
        if (err instanceof Error && err.message === "ABORT") break;
        failed++;
      }
      onProgress?.(scraped, failed);
    }
  } finally {
    await browser.close();
  }
  return { ok: true, scraped, failed, total };
}
