import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Account } from "@/models/Account";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";

export async function GET() {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = verifyAuthToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = payload.sub;

  try {
    await connectDB();
    const accounts = await Account.find({ userId })
      .sort({ isDefault: -1, createdAt: -1 })
      .exec();
    return NextResponse.json({ ok: true, accounts }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: `Failed to fetch accounts: ${errorMessage}` },
      { status: 500 }
    );
  }
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
  const userId = payload.sub;

  try {
    await connectDB();
    const { name, ssoKey, susSession } = await request.json();

    if (!name || !ssoKey || !susSession) {
      return NextResponse.json(
        { error: "Name, ssoKey, and susSession are required" },
        { status: 400 }
      );
    }

    const existingCount = await Account.countDocuments({ userId }).exec();

    const account = new Account({
      userId,
      name,
      ssoKey,
      susSession,
      isDefault: existingCount === 0,
      updatedAt: new Date(),
    });

    await account.save();
    return NextResponse.json({ ok: true, account }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: `Failed to create account: ${errorMessage}` },
      { status: 500 }
    );
  }
}

