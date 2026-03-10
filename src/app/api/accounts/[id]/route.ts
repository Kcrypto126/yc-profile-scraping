import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Account } from "@/models/Account";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";

export async function PUT(
  request: Request,
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
    const { name, ssoKey, susSession, isDefault } = await request.json();

    if (!name || !ssoKey || !susSession) {
      return NextResponse.json(
        { error: "Name, ssoKey, and susSession are required" },
        { status: 400 }
      );
    }

    if (isDefault === true) {
      // Ensure only one default per user.
      await Account.updateMany({ userId }, { $set: { isDefault: false } }).exec();
    }

    const update: Record<string, unknown> = {
      name,
      ssoKey,
      susSession,
      updatedAt: new Date(),
    };
    if (typeof isDefault === "boolean") {
      update.isDefault = isDefault;
    }

    const account = await Account.findOneAndUpdate(
      { _id: id, userId },
      update,
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
      { error: `Failed to update account: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const account = await Account.findOneAndDelete({ _id: id, userId });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: `Failed to delete account: ${errorMessage}` },
      { status: 500 }
    );
  }
}

