import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Profile } from "@/models/Profile";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";

/**
 * POST /api/profiles/update-sent-badges
 * One-time: set badge to "sent" for all profiles that were sent in the past
 * (have sentAt or sentByAccount set but badge is not "sent").
 */
export async function POST() {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token || !verifyAuthToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const result = await Profile.updateMany(
      {
        badge: { $ne: "sent" },
        $or: [
          { sentAt: { $exists: true, $ne: null } },
          { sentByAccount: { $exists: true, $nin: [null, ""] } },
        ],
      },
      { $set: { badge: "sent" } }
    );

    return NextResponse.json(
      { ok: true, updated: result.modifiedCount, matched: result.matchedCount },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update sent badges error:", error);
    return NextResponse.json(
      { error: "Failed to update sent badges" },
      { status: 500 }
    );
  }
}
