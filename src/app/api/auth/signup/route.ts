import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/Users";
import { hashPassword } from "@/lib/auth";

type SignUpBody = {
  email?: string;
  password?: string;
  name?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as SignUpBody;
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const name = (body.name ?? "").trim() || undefined;

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "Email and password are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ ok: false, error: "Password must be at least 8 characters" }, { status: 400 });
  }

  try {
    await connectDB();

    const existing = await User.findOne({ email }).exec();
    if (existing) {
      return NextResponse.json({ ok: false, error: "An account with this email already exists" }, { status: 409 });
    }

    const { salt, hash, iterations } = hashPassword(password);
    await User.create({
      email,
      name: name || email.split("@")[0],
      enabled: false,
      role: "user",
      passwordSalt: salt,
      passwordHash: hash,
      passwordIterations: iterations,
    });

    return NextResponse.json({
      ok: true,
      message: "Signup successful. Your account is pending approval by an admin.",
    }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
