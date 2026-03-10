import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Account } from "@/models/Account";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";

/** POST /api/accounts/[id]/default – set this account as default for the current user. */
export async function POST(
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
  const userId = payload.sub;

  try {
    await connectDB();

    // Clear previous default for this user.
    await Account.updateMany({ userId }, { $set: { isDefault: false } }).exec();

    const account = await Account.findOneAndUpdate(
      { _id: id, userId },
      { $set: { isDefault: true, updatedAt: new Date() } },
      { new: true }
    );

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, account }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: `Failed to set default account: ${errorMessage}` },
      { status: 500 }
    );
  }
}

