"use client";

import { useCallback, useRef, useState } from "react";
import { parseEmlFile } from "@/lib/eml";
import type { EmailMetadata, FeedItem, StoredFeedItem } from "@/types/feed";

type AddEmailModalProps = {
  onClose: () => void;
  onExtracted: (items: StoredFeedItem[], emailSource: { body: string; metadata: EmailMetadata }) => void;
};

type Tab = "paste" | "upload";

export default function AddEmailModal({ onClose, onExtracted }: AddEmailModalProps) {
  const [tab, setTab] = useState<Tab>("paste");
  const [emailText, setEmailText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<EmailMetadata>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    setError(null);
    const text = await file.text();
    const parsed = parseEmlFile(text);
    setEmailText(parsed.body);
    setMetadata(parsed.metadata);
    setFileName(file.name);
    setTab("paste");
  }, []);

  const handleExtract = async () => {
    if (!emailText.trim()) {
      setError("Please paste or upload an email first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/extract-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailText: emailText.trim(),
          ...metadata,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Extraction failed");
      }

      const items: StoredFeedItem[] = (data.items as FeedItem[]).map((item) => ({
        ...item,
        emailSource: {
          body: emailText.trim(),
          ...metadata,
        },
      }));

      onExtracted(items, { body: emailText.trim(), metadata });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={loading ? undefined : onClose}
        aria-hidden
      />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Add Email</h2>
            <p className="text-sm text-slate-500">Paste or upload to extract items</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex border-b border-slate-100 px-5">
          <TabButton active={tab === "paste"} onClick={() => setTab("paste")}>
            Paste Email
          </TabButton>
          <TabButton active={tab === "upload"} onClick={() => setTab("upload")}>
            Upload .eml
          </TabButton>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === "paste" ? (
            <div>
              {fileName && (
                <p className="mb-2 text-xs text-violet-600">
                  Loaded from {fileName}
                </p>
              )}
              <textarea
                value={emailText}
                onChange={(e) => setEmailText(e.target.value)}
                placeholder="Paste the email body here…"
                rows={12}
                disabled={loading}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
              />
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/50 px-6 py-12 text-center"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleFileUpload(file);
              }}
            >
              <UploadIcon />
              <p className="mt-3 text-sm font-medium text-slate-700">
                Drop a .eml file here
              </p>
              <p className="mt-1 text-xs text-slate-500">or click to browse</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
              >
                Choose File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".eml"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={handleExtract}
            disabled={loading || !emailText.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Spinner />
                Reading what matters…
              </>
            ) : (
              "Extract Items"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
        active
          ? "border-violet-600 text-violet-700"
          : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg className="h-10 w-10 text-violet-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
