import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/Users";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken, hashPassword, verifyPassword } from "@/lib/auth";

type Body = {
  currentPassword?: string;
  newPassword?: string;
};

/** POST /api/auth/change-password – change password for the signed-in user */
export async function POST(request: Request) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  const currentPassword = body.currentPassword ?? "";
  const newPassword = body.newPassword ?? "";

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { ok: false, error: "Current password and new password are required" },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { ok: false, error: "New password must be at least 8 characters" },
      { status: 400 }
    );
  }

  try {
    await connectDB();
    const user = await User.findById(payload.sub).exec();
    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    const hasNewHash =
      typeof user.passwordSalt === "string" &&
      typeof user.passwordHash === "string" &&
      typeof user.passwordIterations === "number";

    let valid = false;
    if (hasNewHash) {
      valid = verifyPassword(
        currentPassword,
        user.passwordSalt,
        user.passwordHash,
        user.passwordIterations
      );
    } else if (typeof user.password === "string" && user.password.length > 0) {
      valid = user.password === currentPassword;
    }

    if (!valid) {
      return NextResponse.json(
        { ok: false, error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    const { salt, hash, iterations } = hashPassword(newPassword);
    user.passwordSalt = salt;
    user.passwordHash = hash;
    user.passwordIterations = iterations;
    user.password = undefined;
    await user.save();

    return NextResponse.json({ ok: true, message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to change password" },
      { status: 500 }
    );
  }
}
