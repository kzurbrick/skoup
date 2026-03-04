"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const ERROR_STORAGE_KEY = "bedtime-book:error";

type StoredError = { error?: string; details?: string } | null;

function getStoredError(): StoredError {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ERROR_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object") return null;
    const o = data as Record<string, unknown>;
    return {
      error: typeof o.error === "string" ? o.error : undefined,
      details: typeof o.details === "string" ? o.details : undefined,
    };
  } catch {
    return null;
  }
}

export default function ErrorPage() {
  const router = useRouter();
  const [stored, setStored] = useState<StoredError>(null);

  useEffect(() => {
    setStored(getStoredError());
  }, []);

  const handleBack = () => {
    sessionStorage.removeItem(ERROR_STORAGE_KEY);
    router.push("/create");
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-12 font-sans dark:bg-zinc-950">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-zinc-800">
            Something went wrong while generating your story.
          </h1>
          {(stored?.error ?? stored?.details) && (
            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              {stored?.error && (
                <p className="text-sm font-medium text-zinc-800">{stored.error}</p>
              )}
              {stored?.details && (
                <p className="mt-1 text-sm text-zinc-600">{stored.details}</p>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={handleBack}
            className="mt-6 rounded-lg bg-zinc-800 px-4 py-2.5 font-medium text-white transition-colors hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2"
          >
            Back to Create
          </button>
        </div>
      </div>
    </div>
  );
}
