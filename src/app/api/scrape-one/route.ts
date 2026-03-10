import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import playwright from "playwright";
import { connectDB } from "@/lib/mongodb";
import { Profile } from "@/models/Profile";
import { Account } from "@/models/Account";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { buildProfileFromCheerio, MAIN_SELECTOR } from "@/lib/parseProfilePage";

export async function POST(request: Request) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = verifyAuthToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let { url, ssoKey, susSession } = await request.json();
  url = url || process.env.NEXT_PUBLIC_FETCH_URL;
  ssoKey = ssoKey || process.env.NEXT_PUBLIC_SSO_KEY;
  susSession = susSession || process.env.NEXT_PUBLIC_SUS_SESSION;

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  // Validate URL format
  try {
    new URL(url);
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid URL format" + err },
      { status: 400 },
    );
  }

  try {
    await connectDB();

    // If ssoKey / susSession not provided, fall back to an existing account.
    // Prefer this user's default account, otherwise most recent; if none, use any account.
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

    let browser;
    if (!browser) {
      browser = await playwright.chromium.launch();
    }
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: {
        "Accept-Encoding": "gzip, deflate, br",
      },
    });
    const page = await context.newPage();

    await page.route("**/*.{png,jpg,jpeg,gif,css}", (route) => route.abort());
    await page.route("**/*.{woff,woff2,ttf,otf}", (route) => route.abort());
    await page.route("**/{analytics,tracking,advertisement}/**", (route) =>
      route.abort(),
    );

    // Set cookies before navigation
    await context.addCookies([
      {
        name: "_sso.key",
        value: ssoKey,
        domain: ".startupschool.org",
        path: "/",
      },
      {
        name: "_sus_session",
        value: susSession,
        domain: ".startupschool.org",
        path: "/",
      },
    ]);

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    try {
      await page.waitForSelector(MAIN_SELECTOR, { timeout: 15000, state: "visible" });
    } catch {
      console.error("Scraping error: main profile container not found", {
        url,
        selectorTried: MAIN_SELECTOR,
      });
      return NextResponse.json(
        {
          ok: false,
          error:
            "Could not find the profile content on this page. The layout may have changed or you may not be logged in.",
        },
        { status: 502 },
      );
    }

    const content = await page.content();
    const $ = cheerio.load(content);
    const mainContent = $(MAIN_SELECTOR);
    const userId = page.url().split("/").pop() ?? "";
    const profile = buildProfileFromCheerio($, mainContent, userId);

    // After scraping: $set only scraped fields; $setOnInsert badge "new" for new docs; preserve badge on update

    const savedProfile = await Profile.findOneAndUpdate(
      { userId: profile.userId },
      {
        $set: { ...profile, updatedAt: new Date() }, // Update scraped fields + timestamp
        $setOnInsert: { badge: "new" }, // Only for new profiles
      },
      { upsert: true, new: true },
    );

    return NextResponse.json(
      { ok: true, profile: savedProfile },
      { status: 200 },
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : "";

    console.error("Scraping error details:", {
      message: errorMessage,
      stack: errorStack,
      url: url,
    });

    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
