import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/Users";
import { Account } from "@/models/Account";
import { Template } from "@/models/Template";
import { Profile } from "@/models/Profile";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";

const DEFAULT_OWNER_EMAIL = "kiranhuxley11@gmail.com";

/**
 * POST /api/admin/assign-accounts-templates
 * One-time: assign all existing Accounts, Templates, and profile badge/sent/visited state
 * to the user with the given email. That user will then "own" them and see them.
 * Admin only.
 */
export async function POST(request: Request) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { email?: string } = {};
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    // optional body
  }
  const ownerEmail = (body.email ?? DEFAULT_OWNER_EMAIL).trim().toLowerCase();
  if (!ownerEmail) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  try {
    await connectDB();

    const adminUser = await User.findById(payload.sub).select("role").exec();
    if (!adminUser || adminUser.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const owner = await User.findOne({ email: ownerEmail }).select("_id").exec();
    if (!owner) {
      return NextResponse.json(
        { error: `User not found with email: ${ownerEmail}` },
        { status: 404 }
      );
    }
    const ownerId = owner._id;

    const [accountsResult, templatesResult] = await Promise.all([
      Account.updateMany({}, { $set: { userId: ownerId } }),
      Template.updateMany({}, { $set: { userId: ownerId } }),
    ]);

    // Migrate profile badge/sent/visited: copy top-level fields into userStates for owner
    const profilesWithLegacy = await Profile.find({
      $or: [
        { sentAt: { $exists: true, $ne: null } },
        { sentByAccount: { $exists: true, $nin: [null, ""] } },
        { badge: { $in: ["sent", "visited", "new"] } },
        { visitedAt: { $exists: true, $ne: null } },
      ],
    })
      .lean()
      .exec();

    let profilesUpdated = 0;
    for (const p of profilesWithLegacy) {
      const doc = await Profile.findById(p._id).exec();
      if (!doc) continue;
      const hasOwnerState = doc.userStates?.some((s) => String(s.userId) === String(ownerId));
      if (hasOwnerState) continue;
      const state = {
        userId: ownerId,
        badge: (p as { badge?: string }).badge ?? "new",
        sentAt: (p as { sentAt?: Date | null }).sentAt ?? null,
        sentByAccount: (p as { sentByAccount?: string | null }).sentByAccount ?? null,
        sentWithTemplate: (p as { sentWithTemplate?: string | null }).sentWithTemplate ?? null,
        visitedAt: (p as { visitedAt?: Date | null }).visitedAt ?? null,
        visited: (p as { visited?: boolean }).visited ?? false,
      };
      if (!doc.userStates) doc.userStates = [];
      doc.userStates.push(state as never);
      await doc.save();
      profilesUpdated++;
    }

    return NextResponse.json(
      {
        ok: true,
        message: `Assigned all accounts, templates, and profile states to ${ownerEmail}`,
        ownerEmail,
        accountsUpdated: accountsResult.modifiedCount,
        accountsMatched: accountsResult.matchedCount,
        templatesUpdated: templatesResult.modifiedCount,
        templatesMatched: templatesResult.matchedCount,
        profilesUpdated,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Assign accounts/templates error:", err);
    return NextResponse.json(
      { error: "Failed to assign accounts and templates" },
      { status: 500 }
    );
  }
}
