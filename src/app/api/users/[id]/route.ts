import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/Users";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

/** DELETE /api/users/[id] – remove a user (admin only). Cannot remove self. */
export async function DELETE(_request: Request, { params }: Params) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "User id required" }, { status: 400 });
  }

  if (payload.sub === id) {
    return NextResponse.json(
      { ok: false, error: "You cannot remove your own account" },
      { status: 400 }
    );
  }

  try {
    await connectDB();
    const adminUser = await User.findById(payload.sub).select("role").exec();
    if (!adminUser || adminUser.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const target = await User.findById(id).select("role").exec();
    if (!target) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    const adminCount = await User.countDocuments({ role: "admin", enabled: true }).exec();
    if (target.role === "admin" && adminCount <= 1) {
      return NextResponse.json(
        { ok: false, error: "Cannot remove the last admin" },
        { status: 400 }
      );
    }

    await User.findByIdAndDelete(id).exec();
    return NextResponse.json({ ok: true, message: "User removed" });
  } catch (err) {
    console.error("Delete user error:", err);
    return NextResponse.json({ error: "Failed to remove user" }, { status: 500 });
  }
}
