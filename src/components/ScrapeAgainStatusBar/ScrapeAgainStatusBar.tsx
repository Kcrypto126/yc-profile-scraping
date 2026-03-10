"use client";

import React, { useEffect, useState, useRef } from "react";
import { toast } from "react-toastify";

const POLL_MS = 2000;

type Job = { running: boolean; scraped: number; failed: number; total: number };

export default function ScrapeAgainStatusBar() {
  const [job, setJob] = useState<Job | null>(null);
  const [stopping, setStopping] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const fetchStatus = async (retries = 1) => {
      try {
        const res = await fetch("/api/scrape-again", { credentials: "same-origin" });
        if (res.status === 401 && retries > 0) {
          await new Promise((r) => setTimeout(r, 600));
          return fetchStatus(retries - 1);
        }
        if (!res.ok) return;
        const data = (await res.json()) as Job;
        if (data.running && data.total > 0) {
          setJob(data);
          if (pollRef.current == null) {
            pollRef.current = setInterval(async () => {
              try {
                const r = await fetch("/api/scrape-again", { credentials: "same-origin" });
                if (!r.ok) return;
                const j = (await r.json()) as Job;
                setJob(j);
                if (!j.running) {
                  if (pollRef.current) {
                    clearInterval(pollRef.current);
                    pollRef.current = null;
                  }
                  setJob(null);
                  toast.success(
                    `Scrape again finished: ${j.scraped} updated, ${j.failed} failed (${j.total} total)`
                  );
                }
              } catch {
                // ignore
              }
            }, POLL_MS);
          }
        } else {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          setJob(null);
        }
      } catch {
        setJob(null);
      }
    };

    fetchStatus();
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  const handleStop = async () => {
    if (stopping) return;
    setStopping(true);
    try {
      const res = await fetch("/api/scrape-again", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancel: true }),
      });
      if (res.ok) {
        toast.info("Scrape again stopped.");
        setJob(null);
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    } catch {
      toast.error("Failed to stop.");
    } finally {
      setStopping(false);
    }
  };

  if (job == null || !job.running || job.total === 0) return null;

  const percent = Math.round(((job.scraped + job.failed) / job.total) * 100);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-gray-800 text-white shadow-lg border-t border-gray-700">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4 mb-1.5">
          <span className="text-sm font-medium">
            Scrape again in progress: {job.scraped} updated, {job.failed} failed, {job.total} total
          </span>
          <div className="flex items-center gap-3">
            <span className="text-sm tabular-nums text-gray-300">{percent}%</span>
            <button
              type="button"
              onClick={handleStop}
              disabled={stopping}
              className="px-3 py-1.5 text-sm font-medium rounded bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:pointer-events-none"
            >
              {stopping ? "Stopping…" : "Stop"}
            </button>
          </div>
        </div>
        <div className="h-2 w-full bg-gray-700 rounded overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
