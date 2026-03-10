"use client";

import { useState, useEffect } from "react";
import AuthGuard from "@/components/AuthGuard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

type Period = "day" | "week" | "month";

interface TimeSeriesPoint {
  date: string;
  count: number;
}

interface ByAccountPoint {
  account: string;
  count: number;
}

interface ByTemplatePoint {
  template: string;
  count: number;
}

interface OverviewData {
  ok: boolean;
  period: Period;
  fromDate: string | null;
  toDate: string | null;
  totalSent: number;
  timeSeries: TimeSeriesPoint[];
  byAccount: ByAccountPoint[];
  byTemplate: ByTemplatePoint[];
}

function toYYYYMMDD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const PERIOD_LABELS: Record<Period, string> = {
  day: "Daily",
  week: "Weekly",
  month: "Monthly",
};

function getDefaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: toYYYYMMDD(from), to: toYYYYMMDD(to) };
}

export default function OverviewPage() {
  const [period, setPeriod] = useState<Period>("day");
  const [fromDate, setFromDate] = useState<string>(() => getDefaultDateRange().from);
  const [toDate, setToDate] = useState<string>(() => getDefaultDateRange().to);
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ period });
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);
    fetch(`/api/analytics/overview?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.ok) setData(json);
        else if (!cancelled) setError(json.error || "Failed to load");
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load analytics");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period, fromDate, toDate]);

  return (
    <AuthGuard>
      <div className="min-h-[calc(100vh-64px)] p-6 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
            Bidding overview
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            See which account and which proposal (template) perform best over time.
          </p>

          {/* Date range: from special day to special day */}
          <div className="rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Date range
            </h2>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="fromDate" className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  From
                </label>
                <input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="toDate" className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  To
                </label>
                <input
                  id="toDate"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              All charts and totals below use invites sent in this range. By account / by template show how many proposals each account and template had in this period.
            </p>
          </div>

          {/* Period selector (for grouping the time-series chart) */}
          <div className="flex gap-2 mb-6">
            <span className="text-sm text-gray-600 dark:text-gray-400 self-center mr-2">Group by:</span>
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  period === p
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-500">Loading analytics…</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 mb-6">
              {error}
            </div>
          )}

          {!loading && data && (
            <>
              {/* Summary card */}
              <div className="rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  Invites in selected range
                </h2>
                {(data.fromDate || data.toDate) && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {data.fromDate ?? "…"} → {data.toDate ?? "…"}
                  </p>
                )}
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {data.totalSent}
                </p>
              </div>

              {/* Insights: which account & which template */}
              {(data.byAccount.length > 0 || data.byTemplate.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {data.byAccount.length > 0 && (
                    <div className="rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Best account to use
                      </h3>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {data.byAccount[0].account}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {data.byAccount[0].count} invites sent
                      </p>
                    </div>
                  )}
                  {data.byTemplate.length > 0 && (
                    <div className="rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Best proposal (template)
                      </h3>
                      <p className="text-xl font-bold text-gray-900 dark:text-white truncate" title={data.byTemplate[0].template}>
                        {data.byTemplate[0].template}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {data.byTemplate[0].count} invites sent
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Chart: Messages over time */}
              <div className="rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Invites over time ({PERIOD_LABELS[period]})
                </h2>
                {data.timeSeries.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.timeSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-600" />
                        <XAxis dataKey="date" className="text-xs" stroke="#9ca3af" />
                        <YAxis className="text-xs" stroke="#9ca3af" />
                        <Tooltip
                          contentStyle={{ backgroundColor: "var(--tw-bg-opacity)", borderRadius: "8px" }}
                          labelStyle={{ color: "var(--tw-text-opacity)" }}
                        />
                        <Area type="monotone" dataKey="count" name="Invites" stroke="#2563eb" fillOpacity={1} fill="url(#colorCount)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 py-8 text-center">No data for this period.</p>
                )}
              </div>

              {/* Charts: By account & By template */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Proposals by account (in selected range)
                  </h2>
                  {data.byAccount.length > 0 ? (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.byAccount} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-600" />
                          <XAxis type="number" stroke="#9ca3af" />
                          <YAxis type="category" dataKey="account" width={70} stroke="#9ca3af" tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="count" name="Invites" fill="#2563eb" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 py-8 text-center">No account data yet.</p>
                  )}
                </div>

                <div className="rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Proposals by template (in selected range)
                  </h2>
                  {data.byTemplate.length > 0 ? (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.byTemplate} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-600" />
                          <XAxis type="number" stroke="#9ca3af" />
                          <YAxis type="category" dataKey="template" width={70} stroke="#9ca3af" tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="count" name="Invites" fill="#059669" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 py-8 text-center">
                      No template data yet. Template is recorded when you send from the dashboard.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
