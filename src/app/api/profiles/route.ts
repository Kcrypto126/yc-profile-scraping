import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { FilterQuery } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Profile } from "@/models/Profile";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";

function getMyState(profile: { userStates?: Array<{ userId?: unknown; badge?: string; sentAt?: Date | null; sentByAccount?: string | null; sentWithTemplate?: string | null; visitedAt?: Date | null; visited?: boolean }> }, currentUserId: string) {
  const uid = new mongoose.Types.ObjectId(currentUserId);
  const state = profile.userStates?.find((s) => s.userId && String(s.userId) === String(uid));
  return state
    ? {
        badge: state.badge ?? "new",
        sentAt: state.sentAt ?? null,
        sentByAccount: state.sentByAccount ?? null,
        sentWithTemplate: state.sentWithTemplate ?? null,
        visitedAt: state.visitedAt ?? null,
        visited: state.visited ?? false,
      }
    : { badge: "new" as const, sentAt: null, sentByAccount: null, sentWithTemplate: null, visitedAt: null, visited: false };
}

export async function GET(request: Request) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ data: [], message: "Unauthorized" }, { status: 401 });
  }
  const payload = verifyAuthToken(token);
  if (!payload) {
    return NextResponse.json({ data: [], message: "Unauthorized" }, { status: 401 });
  }
  const currentUserId = payload.sub;

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") || "100");
  const page = parseInt(url.searchParams.get("page") || "1");
  const name = url.searchParams.get("name");
  const age = url.searchParams.get("age");
  const location = url.searchParams.get("location");
  const funding = url.searchParams.get("funding");
  const filterSent = url.searchParams.get("filterSent") === "1" || url.searchParams.get("filterSent") === "true";
  const filterVisited = url.searchParams.get("filterVisited") === "1" || url.searchParams.get("filterVisited") === "true";
  const filterNew = url.searchParams.get("filterNew") === "1" || url.searchParams.get("filterNew") === "true";
  const filterTechnical = url.searchParams.get("filterTechnical") === "1" || url.searchParams.get("filterTechnical") === "true";
  const filterNonTechnical = url.searchParams.get("filterNonTechnical") === "1" || url.searchParams.get("filterNonTechnical") === "true";

  const skip = (page - 1) * limit;
  const query: FilterQuery<typeof Profile> = {};
  const uidObj = new mongoose.Types.ObjectId(currentUserId);

  if (age) {
    const parsedAge = parseInt(age);
    if (!isNaN(parsedAge)) query.age = { $gte: parsedAge };
  }
  if (name) query.name = { $regex: name, $options: "i" };
  if (location) query.location = { $regex: location, $options: "i" };
  if (funding) query["startup.funding"] = { $regex: funding, $options: "i" };

  // Per-user badge filters: match profiles where this user's userState has the badge
  if (filterSent) query["userStates"] = { $elemMatch: { userId: uidObj, badge: "sent" } };
  else if (filterVisited) query["userStates"] = { $elemMatch: { userId: uidObj, badge: "visited" } };
  else if (filterNew) {
    query["$or"] = [
      { userStates: { $not: { $elemMatch: { userId: uidObj } } } },
      { "userStates": { $elemMatch: { userId: uidObj, badge: "new" } } },
    ];
  }

  if (filterTechnical) query.technical = true;
  else if (filterNonTechnical) query.technical = false;

  try {
    await connectDB();

    const total = await Profile.countDocuments();
    const matched = await Profile.countDocuments(query);

    const raw = await Profile.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .allowDiskUse(true)
      .lean()
      .exec();

    const profiles = raw.map((p) => {
      const my = getMyState(p as Parameters<typeof getMyState>[0], currentUserId);
      const { userStates, ...rest } = p as Record<string, unknown> & { userStates?: unknown[] };
      return { ...rest, ...my };
    });

    return NextResponse.json(
      { data: profiles, total, matched },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : "";

    console.error("Fetching error details:", {
      message: errorMessage,
      stack: errorStack,
    });

    return NextResponse.json(
      { data: [], message: errorMessage },
      { status: 500 }
    ); // Added error message to response
  }
}
