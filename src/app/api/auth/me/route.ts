import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/Users";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  void request;
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    await connectDB();
    const user = await User.findById(payload.sub).select("email name enabled role").exec();
    if (!user || user.enabled === false) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    const role = user.role === "admin" ? "admin" : "user";
    return NextResponse.json({
      ok: true,
      user: { id: String(user._id), email: user.email, name: user.name ?? null, role },
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}


