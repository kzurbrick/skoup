"use client";

import { useEffect, useState } from "react";
import {
  canAddToCalendar,
  CATEGORY_STYLES,
} from "@/lib/feed";
import { downloadIcsFile } from "@/lib/ics";
import {
  CATEGORY_LABELS,
  type FeedCategory,
  type StoredFeedItem,
} from "@/types/feed";

type ItemDetailModalProps = {
  item: StoredFeedItem;
  onClose: () => void;
  onSave: (id: string, updates: Partial<StoredFeedItem>) => void;
  onMarkDone: (id: string) => void;
  onDismiss: (id: string) => void;
  onViewSource: () => void;
};

const CATEGORIES: FeedCategory[] = [
  "event",
  "deadline",
  "action",
  "change",
  "money",
  "document",
  "announcement",
];

export default function ItemDetailModal({
  item,
  onClose,
  onSave,
  onMarkDone,
  onDismiss,
  onViewSource,
}: ItemDetailModalProps) {
  const [draft, setDraft] = useState(item);
  const [saved, setSaved] = useState(false);
  const styles = CATEGORY_STYLES[draft.category];
  const showCalendar = canAddToCalendar(draft.category) && draft.date;

  useEffect(() => {
    setDraft(item);
    setSaved(false);
  }, [item]);

  const handleSave = () => {
    onSave(item.id, draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const update = (field: keyof StoredFeedItem, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value || undefined }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles.bg} ${styles.text}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
              {CATEGORY_LABELS[draft.category]}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <Field label="Title">
            <input
              type="text"
              value={draft.title}
              onChange={(e) => update("title", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Category">
            <select
              value={draft.category}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  category: e.target.value as FeedCategory,
                }))
              }
              className={inputClass}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <input
                type="date"
                value={draft.date ?? ""}
                onChange={(e) => update("date", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Start Time">
              <input
                type="time"
                value={draft.startTime ?? ""}
                onChange={(e) => update("startTime", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Location">
            <input
              type="text"
              value={draft.location ?? ""}
              onChange={(e) => update("location", e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </Field>

          {draft.category === "money" && (
            <Field label="Amount">
              <input
                type="text"
                value={draft.amount ?? ""}
                onChange={(e) => update("amount", e.target.value)}
                placeholder="e.g. $75"
                className={inputClass}
              />
            </Field>
          )}

          <Field label="Description">
            <textarea
              value={draft.summary}
              onChange={(e) => update("summary", e.target.value)}
              rows={3}
              className={inputClass}
            />
          </Field>

          <Field label="Required Action">
            <input
              type="text"
              value={draft.actionRequired ?? ""}
              onChange={(e) => update("actionRequired", e.target.value)}
              placeholder="What you need to do"
              className={inputClass}
            />
          </Field>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-slate-500">
                Source Excerpt
              </label>
              {draft.emailSource && (
                <button
                  type="button"
                  onClick={onViewSource}
                  className="text-xs font-medium text-violet-600 hover:text-violet-800"
                >
                  View full email →
                </button>
              )}
            </div>
            <blockquote className="rounded-xl border-l-4 border-violet-200 bg-violet-50/50 px-4 py-3 text-sm italic leading-relaxed text-slate-600">
              &ldquo;{draft.sourceExcerpt}&rdquo;
            </blockquote>
          </div>

          {(draft.emailSource?.sender || draft.emailSource?.subject) && (
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
              {draft.emailSource.subject && (
                <p>
                  <span className="font-medium">Subject:</span>{" "}
                  {draft.emailSource.subject}
                </p>
              )}
              {draft.emailSource.sender && (
                <p>
                  <span className="font-medium">From:</span>{" "}
                  {draft.emailSource.sender}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={handleSave}
            className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-700"
          >
            {saved ? "Saved ✓" : "Save Changes"}
          </button>
          <div className="grid grid-cols-3 gap-2">
            {showCalendar && (
              <button
                type="button"
                onClick={() => downloadIcsFile(draft)}
                className="rounded-xl bg-blue-50 py-2.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
              >
                Calendar
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onMarkDone(item.id);
                onClose();
              }}
              className="rounded-xl bg-emerald-50 py-2.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
            >
              Mark Done
            </button>
            <button
              type="button"
              onClick={() => {
                onDismiss(item.id);
                onClose();
              }}
              className="rounded-xl bg-slate-50 py-2.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-violet-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
