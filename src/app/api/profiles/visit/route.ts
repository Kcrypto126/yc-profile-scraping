import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Profile } from "@/models/Profile";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";

function upsertUserStateVisit(doc: { userStates?: Array<{ userId: mongoose.Types.ObjectId; badge?: string; visitedAt?: Date; visited?: boolean }>; save: () => Promise<unknown> }, appUserId: string, now: Date) {
  const uid = new mongoose.Types.ObjectId(appUserId);
  if (!doc.userStates) doc.userStates = [];
  let state = doc.userStates.find((s) => String(s.userId) === String(uid));
  if (!state) {
    state = { userId: uid, badge: "visited", visitedAt: now, visited: true };
    doc.userStates.push(state);
  } else {
    if (state.badge !== "sent") {
      state.badge = "visited";
      state.visitedAt = now;
      state.visited = true;
    }
  }
  return state;
}

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

  let body: { userId?: string; id?: string; _id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = body?.id ?? body?._id;
  const rawUserId = body?.userId;
  if (!id && (rawUserId == null || (typeof rawUserId !== "string" && typeof rawUserId !== "number"))) {
    return NextResponse.json({ error: "id or userId is required" }, { status: 400 });
  }
  const profileUserId = rawUserId != null ? String(rawUserId).trim() : "";

  try {
    await connectDB();
    const now = new Date();

    if (id && typeof id === "string") {
      const doc = await Profile.findById(id).exec();
      if (!doc) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }
      const state = upsertUserStateVisit(doc, appUserId, now);
      await doc.save();
      const visitedAt = state.visitedAt ?? now;
      return NextResponse.json(
        { ok: true, badge: state.badge ?? "visited", visited: true, visitedAt: visitedAt instanceof Date ? visitedAt.toISOString() : visitedAt },
        { status: 200 }
      );
    }

    if (!profileUserId) {
      return NextResponse.json({ error: "id or userId is required" }, { status: 400 });
    }
    let doc = await Profile.findOne({ userId: profileUserId }).exec();
    if (!doc && profileUserId !== "" && !Number.isNaN(Number(profileUserId))) {
      doc = await Profile.findOne({ userId: Number(profileUserId) }).exec();
    }
    if (!doc) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    const state = upsertUserStateVisit(doc, appUserId, now);
    await doc.save();
    const visitedAt = state.visitedAt ?? now;
    return NextResponse.json(
      { ok: true, badge: state.badge ?? "visited", visited: true, visitedAt: visitedAt instanceof Date ? visitedAt.toISOString() : visitedAt },
      { status: 200 }
    );
  } catch (error) {
    console.error("Profile visit update error:", error);
    return NextResponse.json({ error: "Failed to update visit" }, { status: 500 });
  }
}
