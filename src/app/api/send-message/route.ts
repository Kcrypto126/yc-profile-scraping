import { NextResponse } from "next/server";
import playwright from "playwright";
import mongoose from "mongoose";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Profile } from "@/models/Profile";

export async function POST(request: Request) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = verifyAuthToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const appUserId = payload.sub;

  const { url, message, accountName, templateName, ...rest } = await request.json();
  let { ssoKey, susSession } = rest as {
    ssoKey?: string;
    susSession?: string;
  };
  ssoKey = ssoKey || process.env.NEXT_PUBLIC_SSO_KEY;
  susSession = susSession || process.env.NEXT_PUBLIC_SUS_SESSION;

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  if (!message || !message.trim()) {
    return NextResponse.json(
      { error: "Message is required" },
      { status: 400 }
    );
  }

  if (!ssoKey || !susSession) {
    return NextResponse.json(
      { error: "ssoKey and susSession are required to send a message" },
      { status: 400 }
    );
  }

  // Validate URL format
  try {
    new URL(url);
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid URL format" + err },
      { status: 400 }
    );
  }

  let browser;
  try {
    browser = await playwright.chromium.launch();
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
      route.abort()
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

    // Navigate to the profile page
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Wait for the page to load
    await page.waitForSelector(".css-139x40p", { timeout: 10000 }).catch(() => {
      // Profile content might not be available, continue anyway
    });

    // Wait a bit for any modals or forms to appear
    await page.waitForTimeout(2000);

    // Look for the invite form based on the actual HTML structure
    // The form has: textarea.css-1z3uvv and button with text "Invite to connect"

    // Try to find the textarea with the specific class first
    let messageTextarea = null;
    try {
      // Wait for the textarea to appear (it might be in a modal or form)
      messageTextarea = await page.waitForSelector('textarea.css-1z3uvv', {
        timeout: 5000
      }).catch(() => null);
    } catch {
      // Continue to try other selectors
    }

    // If not found, try finding by placeholder text
    if (!messageTextarea) {
      try {
        messageTextarea = await page.waitForSelector(
          'textarea[placeholder*="excited about potentially working" i]',
          { timeout: 3000 }
        ).catch(() => null);
      } catch {
        // Continue
      }
    }

    // Fallback: find any textarea that might be the message input
    if (!messageTextarea) {
      const textareas = await page.$$('textarea');
      for (const textarea of textareas) {
        const placeholder = await textarea.getAttribute("placeholder");
        if (
          placeholder &&
          (placeholder.includes("Invite") ||
            placeholder.includes("excited") ||
            placeholder.includes("message"))
        ) {
          messageTextarea = textarea;
          break;
        }
      }
    }

    if (!messageTextarea) {
      return NextResponse.json(
        { error: "Could not find message textarea. The invite form may not be visible on the page." },
        { status: 400 }
      );
    }

    // Fill the textarea with the message
    await messageTextarea.fill(message);
    await page.waitForTimeout(500);

    // Find the "Invite to connect" button using multiple strategies
    let inviteButton = null;

    // Strategy 1: Find by class (most specific)
    try {
      inviteButton = await page.$("button.css-cen5mg");
      if (inviteButton) {
        const text = await inviteButton.textContent();
        if (!text || !text.includes("Invite")) {
          inviteButton = null;
        }
      }
    } catch {
      // Continue to next strategy
    }

    // Strategy 2: Find all buttons and check their text
    if (!inviteButton) {
      const buttons = await page.$$("button");
      for (const button of buttons) {
        try {
          const text = await button.textContent();
          if (text && text.trim() === "Invite to connect") {
            inviteButton = button;
            break;
          }
        } catch {
          // Continue to next button
        }
      }
    }

    // Strategy 3: Try finding button with class e1qryfvo3 (from the HTML structure)
    if (!inviteButton) {
      try {
        inviteButton = await page.$("button.e1qryfvo3");
        if (inviteButton) {
          const text = await inviteButton.textContent();
          if (!text || !text.includes("Invite")) {
            inviteButton = null;
          }
        }
      } catch {
        // Continue
      }
    }

    // Strategy 4: Find button containing "Invite" (case-insensitive)
    if (!inviteButton) {
      const buttons = await page.$$("button");
      for (const button of buttons) {
        try {
          const text = await button.textContent();
          if (text && text.toLowerCase().includes("invite")) {
            inviteButton = button;
            break;
          }
        } catch {
          // Continue to next button
        }
      }
    }

    if (!inviteButton) {
      return NextResponse.json(
        { error: "Could not find 'Invite to connect' button" },
        { status: 400 }
      );
    }

    // Click the invite button
    await inviteButton.click();
    await page.waitForTimeout(3000); // Wait for the action to complete

    // Check the status message in the css-1dukzro div
    let statusMessage = "";
    let invitesLeft = null;
    let isSuccess = false;

    try {
      const statusDiv = await page.$("div.css-1dukzro");
      if (statusDiv) {
        const statusText = await statusDiv.textContent();
        statusMessage = statusText?.trim() || "";

        // Check if it contains a <b> tag with a number (success case)
        const statusHTML = await statusDiv.innerHTML();
        const boldMatch = statusHTML.match(/<b>(\d+)<\/b>/);

        if (boldMatch) {
          // Success case: has <b> tag with number
          invitesLeft = parseInt(boldMatch[1], 10);
          isSuccess = true;
        } else {
          // Failed case: no <b> tag, likely an error message
          isSuccess = false;
        }
      } else {
        // If we can't find the status div, assume success (form might have disappeared)
        isSuccess = true;
        statusMessage = "Message sent successfully";
      }
    } catch {
      // If we can't read the status, assume success
      isSuccess = true;
      statusMessage = "Message sent successfully";
    }

    // If no 500: record sent for this app user (per-user badge/sent)
    if (url) {
      try {
        await connectDB();
        const pathSegments = url.replace(/\/$/, "").split("/").filter(Boolean);
        const profileUserId = pathSegments[pathSegments.length - 1];
        if (profileUserId) {
          const doc = await Profile.findOne({ userId: profileUserId }).exec();
          if (doc) {
            const uid = new mongoose.Types.ObjectId(appUserId);
            if (!doc.userStates) doc.userStates = [];
            let state = doc.userStates.find((s: { userId: mongoose.Types.ObjectId }) => String(s.userId) === String(uid));
            if (!state) {
              state = {
                userId: uid,
                badge: "sent",
                sentAt: new Date(),
                sentByAccount: accountName || "Unknown",
                sentWithTemplate: templateName != null && templateName !== "" ? templateName : null,
                visitedAt: null,
                visited: false,
              };
              doc.userStates.push(state);
            } else {
              state.badge = "sent";
              state.sentAt = new Date();
              state.sentByAccount = accountName || "Unknown";
              if (templateName != null && templateName !== "") state.sentWithTemplate = templateName;
            }
            await doc.save();
          }
        }
      } catch (dbError) {
        console.error("Failed to update profile (Sent By):", dbError);
      }
    }

    if (isSuccess) {
      const successMsg = invitesLeft !== null
        ? `Message sent successfully! You have ${invitesLeft} invites left for this week.`
        : "Message sent successfully!";

      return NextResponse.json(
        { ok: true, message: successMsg, invitesLeft },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { ok: false, error: statusMessage || "Failed to send message. You may have exhausted your weekly invites." },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : "";

    console.error("Message sending error details:", {
      message: errorMessage,
      stack: errorStack,
      url: url,
    });

    return NextResponse.json(
      { error: `Failed to send message: ${errorMessage}` },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close().catch(() => {
        // Ignore errors when closing browser
      });
    }
  }
}

