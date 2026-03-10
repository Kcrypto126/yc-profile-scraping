"use client";
import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";

const SCRAPE_AGAIN_POLL_INTERVAL_MS = 2000;

interface Account {
  _id: string;
  name: string;
  ssoKey: string;
  susSession: string;
  isDefault?: boolean;
}

export default function ProfileScraper() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [ssoKey, setSsoKey] = useState("");
  const [susSession, setSusSession] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [scrapeAgainLoading, setScrapeAgainLoading] = useState(false);
  const [scrapeAgainProgress, setScrapeAgainProgress] = useState<{
    scraped: number;
    failed: number;
    total: number;
  } | null>(null);
  const [scrapeAgainAbort, setScrapeAgainAbort] = useState<(() => void) | null>(null);
  const [error, setError] = useState("");
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Restore scrape-again progress after reload/navigation: fetch job status and poll while running
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/scrape-again", { credentials: "same-origin" });
        if (!res.ok) return;
        const job = (await res.json()) as { running: boolean; scraped: number; failed: number; total: number };
        if (job.running && job.total > 0) {
          setScrapeAgainProgress({ scraped: job.scraped, failed: job.failed, total: job.total });
          setScrapeAgainLoading(true);
          setScrapeAgainAbort(null);
          if (pollIntervalRef.current == null) {
            pollIntervalRef.current = setInterval(async () => {
              try {
                const r = await fetch("/api/scrape-again", { credentials: "same-origin" });
                if (!r.ok) return;
                const j = (await r.json()) as { running: boolean; scraped: number; failed: number; total: number };
                setScrapeAgainProgress({ scraped: j.scraped, failed: j.failed, total: j.total });
                if (!j.running) {
                  if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                  }
                  setScrapeAgainLoading(false);
                  setScrapeAgainProgress(null);
                  toast.success(
                    `Scrape again finished: ${j.scraped} updated, ${j.failed} failed (${j.total} total)`
                  );
                }
              } catch {
                // ignore
              }
            }, SCRAPE_AGAIN_POLL_INTERVAL_MS);
          }
        } else {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      } catch {
        // ignore
      }
    };
    fetchStatus();
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (selectedAccountId && accounts.length > 0) {
      const account = accounts.find((a) => a._id === selectedAccountId);
      if (account) {
        setSsoKey(account.ssoKey);
        setSusSession(account.susSession);
      }
    }
  }, [selectedAccountId, accounts]);

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (data.ok && data.accounts && data.accounts.length > 0) {
        const list: Account[] = data.accounts;
        setAccounts(list);
        const defaultAccount = list.find((a) => a.isDefault);
        setSelectedAccountId((defaultAccount || list[0])._id);
      } else {
        toast.error(
          "No accounts found. Please add accounts in Manage Account page."
        );
      }
    } catch {
      toast.error("Failed to fetch accounts");
    }
  };

  const handleScrapeOne = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/scrape-one", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, ssoKey, susSession }),
      });

      if (!response.ok) toast.error("Failed to fetch profile");
      else toast.success("Profile fetched successfully");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleScrape = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ssoKey, susSession }),
      });

      if (!response.ok) throw new Error("Failed to fetch profile");

      await response.json();
      // console.log("data: ", data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleScrapeAgain = async () => {
    setError("");
    setScrapeAgainProgress(null);
    const abortController = new AbortController();
    setScrapeAgainAbort(() => () => abortController.abort());
    setScrapeAgainLoading(true);

    try {
      const res = await fetch("/api/scrape-again", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stream: true }),
        signal: abortController.signal,
      });

      if (res.headers.get("content-type")?.includes("application/json")) {
        const data = await res.json();
        setScrapeAgainLoading(false);
        setScrapeAgainProgress(null);
        setScrapeAgainAbort(null);
        if (!res.ok) {
          toast.error(data.error || "Scrape again failed");
          return;
        }
        toast.success(
          `Scrape again: ${data.scraped} updated, ${data.failed} failed (${data.total} total)`
        );
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setScrapeAgainLoading(false);
        setScrapeAgainAbort(null);
        toast.error("Scrape again failed");
        return;
      }
      const decoder = new TextDecoder();
      let buffer = "";
      let total = 0;
      let scraped = 0;
      let failed = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line) as {
              total?: number;
              scraped?: number;
              failed?: number;
              done?: boolean;
              error?: string;
            };
            if (data.total != null) total = data.total;
            if (data.scraped != null) scraped = data.scraped;
            if (data.failed != null) failed = data.failed;
            setScrapeAgainProgress({ scraped, failed, total });
            if (data.done) {
              setScrapeAgainLoading(false);
              setScrapeAgainProgress(null);
              setScrapeAgainAbort(null);
              if (data.error) {
                toast.error(data.error);
              } else {
                toast.success(
                  `Scrape again finished: ${scraped} updated, ${failed} failed (${total} total)`
                );
              }
              return;
            }
          } catch {
            // skip malformed line
          }
        }
      }
      setScrapeAgainLoading(false);
      setScrapeAgainProgress(null);
      setScrapeAgainAbort(null);
      toast.success(
        `Scrape again finished: ${scraped} updated, ${failed} failed (${total} total)`
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        toast.info("Scrape again stopped");
      } else {
        toast.error("Scrape again failed");
      }
      setScrapeAgainLoading(false);
      setScrapeAgainProgress(null);
      setScrapeAgainAbort(null);
    }
  };

  const handleScrapeAgainStop = () => {
    scrapeAgainAbort?.();
  };

  if (accounts.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="text-center p-8">
          <p className="text-red-500 mb-4">
            No accounts found. Please add accounts in Manage Account page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex gap-6 p-4 border rounded flex-wrap">
          {accounts.map((account) => (
            <label
              key={account._id}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="radio"
                value={account._id}
                checked={selectedAccountId === account._id}
                onChange={() => setSelectedAccountId(account._id)}
                className="w-4 h-4"
              />
              <span>{account.name}</span>
            </label>
          ))}
        </div>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter Startup School profile URL"
          className="flex-1 p-2 border rounded"
        />
      </div>
      <div className="flex flex-row justify-center items-center gap-4 mb-8 flex-wrap">
        <button
          onClick={handleScrapeOne}
          disabled={loading || scrapeAgainLoading || ssoKey === "" || susSession === "" || url === ""}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {loading ? "Loading..." : "Scrape One"}
        </button>
        <button
          onClick={handleScrape}
          disabled={loading || scrapeAgainLoading || ssoKey === "" || susSession === ""}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {loading ? "Loading..." : "Scrape Many"}
        </button>
        <button
          onClick={handleScrapeAgain}
          disabled={loading || scrapeAgainLoading}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50"
        >
          Scrape again
        </button>
        {scrapeAgainLoading && scrapeAgainAbort && (
          <button
            type="button"
            onClick={handleScrapeAgainStop}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded"
          >
            Stop
          </button>
        )}
      </div>
      {scrapeAgainProgress != null && scrapeAgainProgress.total > 0 && (
        <div className="mb-6 p-4 border rounded bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Scrape again: {scrapeAgainProgress.scraped} updated, {scrapeAgainProgress.failed} failed, {scrapeAgainProgress.total} total
            </span>
            <span className="text-sm tabular-nums text-gray-600 dark:text-gray-400">
              {Math.round(
                (scrapeAgainProgress.scraped + scrapeAgainProgress.failed) /
                  scrapeAgainProgress.total *
                  100
              )}
              %
            </span>
          </div>
          <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{
                width: `${(scrapeAgainProgress.scraped + scrapeAgainProgress.failed) / scrapeAgainProgress.total * 100}%`,
              }}
            />
          </div>
        </div>
      )}
      {error && <div className="text-red-500 mb-4">{error}</div>}
    </div>
  );
}
