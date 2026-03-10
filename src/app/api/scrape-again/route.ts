import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import playwright from "playwright";
import { connectDB } from "@/lib/mongodb";
import { Profile } from "@/models/Profile";
import { Account } from "@/models/Account";
import {
  getScrapeAgainJob,
  setScrapeAgainJob,
} from "@/models/ScrapeAgainJob";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { buildProfileFromCheerio, MAIN_SELECTOR } from "@/lib/parseProfilePage";

const CANDIDATE_BASE_URL =
  "https://www.startupschool.org/cofounder-matching/candidate";

/** AbortController for the current scrape-again job; Stop button aborts this. */
let currentJobAbortController: AbortController | null = null;

function sendLine(controller: ReadableStreamDefaultController<Uint8Array>, obj: object) {
  controller.enqueue(new TextEncoder().encode(JSON.stringify(obj) + "\n"));
}

async function runScrapeLoop(
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
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForSelector(MAIN_SELECTOR, { timeout: 15000, state: "visible" });
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
      } catch {
        failed++;
      }
      onProgress?.(scraped, failed);
    }
  } finally {
    await browser.close();
  }
  return { ok: true, scraped, failed, total };
}

/** GET /api/scrape-again – return current scrape-again job status (persisted in DB so it survives refresh). */
export async function GET() {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token || !verifyAuthToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await connectDB();
    const job = await getScrapeAgainJob();
    return NextResponse.json(job, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("GET scrape-again job error:", e);
    return NextResponse.json(
      { running: false, scraped: 0, failed: 0, total: 0 },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}

/** POST /api/scrape-again – re-scrape all profiles. Use body.stream: true for NDJSON progress stream and abort support. */
export async function POST(request: Request) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = verifyAuthToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    ssoKey?: string;
    susSession?: string;
    stream?: boolean;
    cancel?: boolean;
  };
  const { cancel: wantCancel } = body;

  if (wantCancel) {
    try {
      await connectDB();
      const job = await getScrapeAgainJob();
      if (currentJobAbortController) {
        currentJobAbortController.abort();
        currentJobAbortController = null;
      }
      await setScrapeAgainJob({
        running: false,
        scraped: job.scraped,
        failed: job.failed,
        total: job.total,
      });
      return NextResponse.json({ ok: true, cancelled: true });
    } catch (e) {
      console.error("Scrape-again cancel error:", e);
      return NextResponse.json({ ok: false, error: "Cancel failed" }, { status: 500 });
    }
  }

  let { ssoKey, susSession, stream: wantStream } = body;
  ssoKey = ssoKey || process.env.NEXT_PUBLIC_SSO_KEY;
  susSession = susSession || process.env.NEXT_PUBLIC_SUS_SESSION;

  try {
    await connectDB();

    if (!ssoKey || !susSession) {
      const userId = payload.sub;
      const accountDoc =
        (await Account.findOne({ userId })
          .sort({ isDefault: -1, createdAt: -1 })
          .exec()) ??
        (await Account.findOne({})
          .sort({ isDefault: -1, createdAt: -1 })
          .exec());
      const account = accountDoc as { ssoKey?: string; susSession?: string } | null;
      if (!account) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "No saved Startup School account found. Please create an account in Manage Account or provide ssoKey and susSession.",
          },
          { status: 400 },
        );
      }
      ssoKey = account.ssoKey ?? ssoKey;
      susSession = account.susSession ?? susSession;
    }

    const profiles = await Profile.find({})
      .select("userId")
      .lean()
      .exec();
    const total = profiles.length;

    if (total === 0) {
      return NextResponse.json({
        ok: true,
        total: 0,
        scraped: 0,
        failed: 0,
        errors: [],
      });
    }

    if (!wantStream) {
      const result = await runScrapeLoop(
        profiles as Array<{ userId?: unknown }>,
        request.signal,
        ssoKey!,
        susSession!,
      );
      return NextResponse.json(result);
    }

    const existingJob = await getScrapeAgainJob();
    if (existingJob.running) {
      return NextResponse.json(
        { ok: false, error: "A scrape-again job is already running." },
        { status: 409 },
      );
    }

    await setScrapeAgainJob({ running: true, scraped: 0, failed: 0, total });

    // Local state for this request's stream; DB is source of truth for GET after refresh.
    const streamJob = { running: true, scraped: 0, failed: 0, total };

    currentJobAbortController = new AbortController();

    // Run the loop in the background. Stop works via: (1) currentJobAbortController.signal (same instance), (2) DB running flag (cancel from another instance / after refresh).
    const loopPromise = runScrapeLoop(
      profiles as Array<{ userId?: unknown }>,
      currentJobAbortController.signal,
      ssoKey!,
      susSession!,
      async (scraped, failed) => {
        streamJob.scraped = scraped;
        streamJob.failed = failed;
        await setScrapeAgainJob({
          running: true,
          scraped,
          failed,
          total,
        });
      },
      async () => {
        const j = await getScrapeAgainJob();
        return !j.running;
      },
    );
    loopPromise
      .then(async (result) => {
        currentJobAbortController = null;
        streamJob.running = false;
        streamJob.scraped = result.scraped;
        streamJob.failed = result.failed;
        await setScrapeAgainJob({
          running: false,
          scraped: result.scraped,
          failed: result.failed,
          total: result.total,
        });
      })
      .catch(async (err) => {
        currentJobAbortController = null;
        const msg = err instanceof Error ? err.message : String(err);
        streamJob.running = false;
        await setScrapeAgainJob({
          running: false,
          scraped: streamJob.scraped,
          failed: streamJob.failed,
          total: streamJob.total,
        });
        console.error("Scrape-again background error:", msg);
      });

    // Stream progress by polling job state so client can disconnect without stopping the job.
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const intervalMs = 500;
        sendLine(controller, { total });
        const interval = setInterval(() => {
          try {
            sendLine(controller, {
              scraped: streamJob.scraped,
              failed: streamJob.failed,
              total: streamJob.total,
            });
            if (!streamJob.running) {
              clearInterval(interval);
              sendLine(controller, { done: true, ...streamJob });
              controller.close();
            }
          } catch {
            clearInterval(interval);
            controller.close();
          }
        }, intervalMs);
        // If client disconnects, close our interval (stream will error); job keeps running.
        request.signal?.addEventListener?.("abort", () => {
          clearInterval(interval);
          try {
            controller.close();
          } catch {
            // ignore
          }
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Scrape-again error:", errorMessage);
    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 },
    );
  }
}
