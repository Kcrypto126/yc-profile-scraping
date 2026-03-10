import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/Users";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";

/** GET /api/users – list all users (admin only) */
export async function GET() {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const adminUser = await User.findById(payload.sub).select("role").exec();
    if (!adminUser || adminUser.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await User.find({})
      .select("email name role enabled createdAt")
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return NextResponse.json({
      ok: true,
      users: users.map((u) => ({
        _id: u._id,
        email: u.email,
        name: u.name ?? null,
        role: u.role ?? "user",
        enabled: u.enabled ?? false,
        createdAt: u.createdAt,
      })),
    }, { status: 200 });
  } catch (err) {
    console.error("List users error:", err);
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }
}
