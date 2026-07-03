"use client";

import {
  canAddToCalendar,
  CATEGORY_STYLES,
  formatDisplayDate,
  formatDisplayTime,
} from "@/lib/feed";
import { downloadIcsFile } from "@/lib/ics";
import { CATEGORY_LABELS, type StoredFeedItem } from "@/types/feed";

type FeedCardProps = {
  item: StoredFeedItem;
  onView: (item: StoredFeedItem) => void;
  onMarkDone: (id: string) => void;
  onDismiss: (id: string) => void;
};

export default function FeedCard({
  item,
  onView,
  onMarkDone,
  onDismiss,
}: FeedCardProps) {
  const styles = CATEGORY_STYLES[item.category];
  const dateStr = formatDisplayDate(item.date);
  const timeStr = formatDisplayTime(item.startTime);
  const showCalendar = canAddToCalendar(item.category) && item.date;

  return (
    <article className="group rounded-2xl border border-violet-100/80 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-2 flex items-start justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles.bg} ${styles.text}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
          {CATEGORY_LABELS[item.category]}
        </span>
        {item.confidence === "low" && (
          <span className="text-xs text-slate-400">Low confidence</span>
        )}
      </div>

      <h3 className="text-base font-semibold leading-snug text-slate-900">
        {item.title}
      </h3>

      {(dateStr || timeStr || item.location) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-slate-500">
          {dateStr && (
            <span className="flex items-center gap-1">
              <CalendarIcon />
              {dateStr}
              {timeStr && ` · ${timeStr}`}
            </span>
          )}
          {!dateStr && timeStr && (
            <span className="flex items-center gap-1">
              <ClockIcon />
              {timeStr}
            </span>
          )}
          {item.location && (
            <span className="flex items-center gap-1">
              <PinIcon />
              {item.location}
            </span>
          )}
        </div>
      )}

      {item.amount && (
        <p className="mt-1 text-sm font-medium text-violet-700">{item.amount}</p>
      )}

      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">
        {item.summary}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onView(item)}
          className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100"
        >
          View
        </button>
        <button
          type="button"
          onClick={() => onMarkDone(item.id)}
          className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
        >
          Mark Done
        </button>
        <button
          type="button"
          onClick={() => onDismiss(item.id)}
          className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100"
        >
          Dismiss
        </button>
        {showCalendar && (
          <button
            type="button"
            onClick={() => downloadIcsFile(item)}
            className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
          >
            Add to Calendar
          </button>
        )}
      </div>
    </article>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}
