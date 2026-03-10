import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Profile } from "@/models/Profile";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";

type Period = "day" | "week" | "month";

function getDateFormat(period: Period): string {
  switch (period) {
    case "day":
      return "%Y-%m-%d";
    case "week":
      return "%Y-W%V";
    case "month":
      return "%Y-%m";
    default:
      return "%Y-%m-%d";
  }
}

export async function GET(request: Request) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = verifyAuthToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const currentUserId = new mongoose.Types.ObjectId(payload.sub);

  const url = new URL(request.url);
  const rawPeriod = url.searchParams.get("period") || "day";
  const period: Period = rawPeriod === "week" || rawPeriod === "month" ? rawPeriod : "day";
  const fromDateParam = url.searchParams.get("fromDate");
  const toDateParam = url.searchParams.get("toDate");

  const dateFormat = getDateFormat(period);

  const sentAtFilter: Record<string, unknown> = { $exists: true, $ne: null };
  if (fromDateParam) sentAtFilter.$gte = new Date(fromDateParam + "T00:00:00.000Z");
  if (toDateParam) sentAtFilter.$lte = new Date(toDateParam + "T23:59:59.999Z");

  // Per-user: unwind userStates, match current user and sentAt
  const unwindMatch = [
    { $match: { "userStates.userId": currentUserId } },
    { $unwind: "$userStates" },
    { $match: { "userStates.userId": currentUserId, "userStates.sentAt": sentAtFilter } },
    { $addFields: { sentAt: "$userStates.sentAt", sentByAccount: "$userStates.sentByAccount", sentWithTemplate: "$userStates.sentWithTemplate" } },
  ];

  try {
    await connectDB();

    const timeSeriesPipeline = [
      ...unwindMatch,
      { $group: { _id: { $dateToString: { format: dateFormat, date: "$sentAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 as 1 } },
      { $project: { date: "$_id", count: 1, _id: 0 } },
    ];

    const byAccountPipeline = [
      ...unwindMatch,
      { $group: { _id: "$sentByAccount", count: { $sum: 1 } } },
      { $sort: { count: -1 as -1 } },
      {
        $project: {
          account: { $ifNull: ["$_id", "Unknown"] },
          count: 1,
          _id: 0,
        },
      },
    ];

    const byTemplatePipeline = [
      ...unwindMatch,
      {
        $match: {
          sentWithTemplate: { $exists: true, $nin: [null, ""] },
        },
      },
      {
        $group: {
          _id: "$sentWithTemplate",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 as -1 } },
      { $project: { template: "$_id", count: 1, _id: 0 } },
    ];

    const countPipeline = [...unwindMatch, { $count: "total" }];

    const [timeSeries, byAccount, byTemplate, totalResult] = await Promise.all([
      Profile.aggregate(timeSeriesPipeline),
      Profile.aggregate(byAccountPipeline),
      Profile.aggregate(byTemplatePipeline),
      Profile.aggregate(countPipeline),
    ]);

    const totalSent = totalResult[0]?.total ?? 0;

    return NextResponse.json({
      ok: true,
      period,
      fromDate: fromDateParam ?? null,
      toDate: toDateParam ?? null,
      totalSent,
      timeSeries,
      byAccount,
      byTemplate,
    });
  } catch (error) {
    console.error("Analytics overview error:", error);
    return NextResponse.json(
      { error: "Failed to load analytics" },
      { status: 500 },
    );
  }
}
