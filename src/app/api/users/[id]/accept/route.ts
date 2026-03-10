import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/Users";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";

/** PATCH /api/users/[id]/accept – set user enabled (admin only) */
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { enabled: true } },
      { new: true }
    )
      .select("email name role enabled")
      .exec();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      user: { _id: user._id, email: user.email, name: user.name ?? null, role: user.role, enabled: user.enabled },
    }, { status: 200 });
  } catch (err) {
    console.error("Accept user error:", err);
    return NextResponse.json({ error: "Failed to accept user" }, { status: 500 });
  }
}
