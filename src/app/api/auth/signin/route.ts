import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/Users";
import { hashPassword, signAuthToken, verifyPassword, AUTH_COOKIE_NAME } from "@/lib/auth";

type SignInBody = {
  email?: string;
  password?: string;
};

/** If ADMIN_EMAIL and ADMIN_PASSWORD are set, ensure that user exists as admin (for initial setup). */
async function ensureAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) return;

  const existing = await User.findOne({ email: adminEmail.toLowerCase().trim() }).exec();
  if (existing) {
    if (existing.role !== "admin") {
      existing.role = "admin";
      existing.enabled = true;
      await existing.save();
    }
    return existing;
  }

  const { salt, hash, iterations } = hashPassword(adminPassword);
  await User.create({
    email: adminEmail.toLowerCase().trim(),
    name: "Admin",
    enabled: true,
    role: "admin",
    passwordSalt: salt,
    passwordHash: hash,
    passwordIterations: iterations,
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as SignInBody;
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "Email and password are required" }, { status: 400 });
  }

  try {
    await connectDB();
    await ensureAdminUser();

    const user = await User.findOne({ email }).exec();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }
    if (user.enabled === false) {
      return NextResponse.json({ ok: false, error: "Account pending approval. An admin must accept your signup." }, { status: 403 });
    }

    // Preferred: PBKDF2 fields
    const hasNewHash =
      typeof user.passwordSalt === "string" &&
      typeof user.passwordHash === "string" &&
      typeof user.passwordIterations === "number";

    let valid = false;
    if (hasNewHash) {
      valid = verifyPassword(password, user.passwordSalt, user.passwordHash, user.passwordIterations);
    } else if (typeof user.password === "string" && user.password.length > 0) {
      // Legacy fallback: plaintext password (migrate on successful login)
      valid = user.password === password;
      if (valid) {
        const { salt, hash, iterations } = hashPassword(password);
        user.passwordSalt = salt;
        user.passwordHash = hash;
        user.passwordIterations = iterations;
        user.password = undefined;
        await user.save();
      }
    }

    if (!valid) {
      return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }

    const role = user.role === "admin" ? "admin" : "user";
    const token = signAuthToken({ sub: String(user._id), email: user.email, role });

    const res = NextResponse.json({ ok: true, user: { email: user.email, name: user.name ?? null, role } });
    res.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7d
    });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}


