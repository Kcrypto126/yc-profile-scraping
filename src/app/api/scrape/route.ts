import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import playwright from "playwright";
import { connectDB } from "@/lib/mongodb";
import { Profile } from "@/models/Profile";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";

export async function POST(request: Request) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token || !verifyAuthToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let { ssoKey, susSession } = await request.json();
  const url = process.env.NEXT_PUBLIC_FETCH_URL;
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

    while (1) {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForSelector(".css-139x40p");

      const content = await page.content();
      const $ = cheerio.load(content);

      const mainContent = $(".css-139x40p");
      // console.log("mainContent: ", mainContent);

      const age = mainContent.find('[title="Age"]').text().replace(/\D/g, "");

      const profile = {
        userId: page.url().split("/").pop(),
        name: mainContent.find(".css-y9z691").text().trim(),
        location: mainContent.find('[title="Location"]').text().trim(),
        age: age ? parseInt(age) : null,
        lastSeen: mainContent
          .find('[title="Last seen on co-founder matching"]')
          .text()
          .replace("Last seen ", "")
          .trim(),
        avatar: mainContent.find(".css-1bm26bw").attr("src"),
        sumary: mainContent.find(".css-1wz7m2j").text().trim(),
        intro: mainContent
          .find('span.css-19yrmx8:contains("Intro")')
          .next(".css-1tp1ukf")
          .text()
          .trim(),
        lifeStory: mainContent
          .find('span.css-19yrmx8:contains("Life Story")')
          .next(".css-1tp1ukf")
          .text()
          .trim(),
        freeTime: mainContent
          .find('span.css-19yrmx8:contains("Free Time")')
          .next(".css-1tp1ukf")
          .text()
          .trim(),
        other: mainContent
          .find('span.css-19yrmx8:contains("Other")')
          .next(".css-1tp1ukf")
          .text()
          .trim(),

        accomplishments: mainContent
          .find('span.css-19yrmx8:contains("Impressive accomplishment")')
          .next(".css-1tp1ukf")
          .text()
          .trim(),

        // Education: new layout uses ul li div.css-1a0w822; legacy uses .css-kaq1dv. None if not found.
        education: (() => {
          const section = mainContent
            .find('.css-19yrmx8:contains("Education")')
            .next(".css-1tp1ukf");
          if (!section.length) return null;
          const byNew = section.find(".css-1a0w822");
          if (byNew.length) return byNew.map((_, el) => $(el).text().trim()).get();
          const legacy = section.find(".css-kaq1dv");
          if (legacy.length) return legacy.map((_, el) => $(el).text().trim()).get();
          return null;
        })(),

        // Employment: same structure as Education. None if not found.
        employment: (() => {
          const section = mainContent
            .find('.css-19yrmx8:contains("Employment")')
            .next(".css-1tp1ukf");
          if (!section.length) return null;
          const byNew = section.find(".css-1a0w822");
          if (byNew.length) return byNew.map((_, el) => $(el).text().trim()).get();
          const legacy = section.find(".css-kaq1dv");
          if (legacy.length) return legacy.map((_, el) => $(el).text().trim()).get();
          return null;
        })(),

        startup: {
          name:
            mainContent.find(".css-bcaew0 b").first().text().trim() !== ""
              ? mainContent.find(".css-bcaew0 b").first().text().trim()
              : "Potential Idea",
          // Avoid building a CSS selector with arbitrary text (can contain parentheses, quotes, etc.)
          // Instead, find the matching label span by text and then read the next description block.
          description: (() => {
            const startupName = mainContent
              .find(".css-bcaew0 b")
              .first()
              .text()
              .trim();

            if (!startupName) {
              return mainContent.find("div.css-1hla380").text().trim();
            }

            const labelSpan = mainContent
              .find("span.css-19yrmx8")
              .filter((_, el) => $(el).text().trim() === startupName)
              .first();

            if (labelSpan.length) {
              return labelSpan.next(".css-1tp1ukf").text().trim();
            }

            return mainContent.find("div.css-1hla380").text().trim();
          })(),
          progress: mainContent
            .find('span.css-19yrmx8:contains("Progress")')
            .next(".css-1tp1ukf")
            .text()
            .trim(),
          funding: mainContent
            .find('span.css-19yrmx8:contains("Funding Status")')
            .next(".css-1tp1ukf")
            .text()
            .trim(),
        },

        cofounderPreferences: {
          requirements: mainContent
            .find(".css-1hla380 p")
            .map((_, el) => $(el).text().trim())
            .get(),
          idealPersonality: mainContent
            .find('span.css-19yrmx8:contains("Ideal co-founder")')
            .next(".css-1tp1ukf")
            .text()
            .trim(),
          equity: mainContent
            .find('span.css-19yrmx8:contains("Equity expectations")')
            .next(".css-1tp1ukf")
            .text()
            .trim(),
        },

        // Interests: new layout uses "Our shared interests" / "My interests" + .css-1tp1ukf + .css-1iujaz8 (shared) / .css-17813s4 (personal). None if not found.
        interests: {
          shared: (() => {
            const section = mainContent
              .find('span.css-19yrmx8:contains("Our shared interests")')
              .next(".css-1tp1ukf");
            if (!section.length) return null;
            const items = section.find(".css-1iujaz8");
            if (items.length) return items.map((_, el) => $(el).text().trim()).get();
            const legacy = mainContent.find(".css-1v9f1hn");
            if (legacy.length) return legacy.map((_, el) => $(el).text().trim()).get();
            return null;
          })(),
          personal: (() => {
            const section = mainContent
              .find('span.css-19yrmx8:contains("My interests")')
              .next(".css-1tp1ukf");
            if (!section.length) return null;
            const items = section.find(".css-17813s4");
            if (items.length) return items.map((_, el) => $(el).text().trim()).get();
            const legacy = mainContent.find(".css-1lw35t7");
            if (legacy.length) return legacy.map((_, el) => $(el).text().trim()).get();
            return null;
          })(),
        },

        linkedIn: mainContent.find(".css-107cmgv").attr("title"),
        // From p.css-vqx3x2 first <b>: "non-technical" -> false, "technical" -> true, else null
        technical: (() => {
          const p = mainContent.find("p.css-vqx3x2");
          if (!p.length) return null;
          const firstB = p.find("b").first().text().trim().toLowerCase();
          if (firstB === "non-technical") return false;
          if (firstB === "technical") return true;
          return null;
        })(),
        idea: (() => {
          const p_idea = mainContent.find("p.css-vqx3x2");
          if (!p_idea.length) return null;
          const lastB = p_idea.find("b").last().text().trim().toLowerCase();
          if (lastB === "committed") return "committed";
          else if (lastB.includes("some ideas")) return "potential";
          return "other";
        })(),
      };
      // Skip profiles from India or Pakistan
      const skipCountries = [
        "India",
        "Pakistan",
        "Nigeria",
        "South Korea",
        "Kenya",
      ];
      const shouldSkip = skipCountries.some((country) =>
        profile.location?.toLowerCase().includes(country.toLowerCase()),
      );

      if (shouldSkip) {
        continue;
      }

      // After scraping: $set only scraped fields; $setOnInsert badge "new" for new docs; preserve badge on update
      await Profile.findOneAndUpdate(
        { userId: profile.userId },
        {
          $set: { ...profile, updatedAt: new Date() },
          $setOnInsert: { badge: "new" },
        },
        { upsert: true, new: true },
      );
    }

    return NextResponse.json({ message: "Profile scraped successfully" });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : "";

    console.error("Scraping error details:", {
      message: errorMessage,
      stack: errorStack,
      url: url,
    });

    return NextResponse.json(
      { error: `Failed to scrape profile: ${errorMessage}` },
      { status: 500 },
    );
  }
}
