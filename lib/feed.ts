import type { DateGroup, FeedCategory, GroupedFeed, StoredFeedItem } from "@/types/feed";

export function getDateGroup(dateStr: string | undefined, now = new Date()): DateGroup {
  if (!dateStr) return "No Date";

  const itemDate = new Date(dateStr + "T12:00:00");
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const endOfWeek = addDays(today, 7 - today.getDay());

  const itemDay = startOfDay(itemDate);

  if (itemDay.getTime() === today.getTime()) return "Today";
  if (itemDay.getTime() === tomorrow.getTime()) return "Tomorrow";
  if (itemDay > tomorrow && itemDay <= endOfWeek) return "This Week";
  if (itemDay > endOfWeek) return "Later";
  if (itemDay < today) return "Today";
  return "Later";
}

const GROUP_ORDER: DateGroup[] = [
  "Today",
  "Tomorrow",
  "This Week",
  "Later",
  "No Date",
];

export function groupFeedItems(items: StoredFeedItem[]): GroupedFeed[] {
  const active = items.filter((i) => i.status === "new");
  const buckets = new Map<DateGroup, StoredFeedItem[]>();

  for (const group of GROUP_ORDER) {
    buckets.set(group, []);
  }

  for (const item of active) {
    const group = getDateGroup(item.date);
    buckets.get(group)!.push(item);
  }

  return GROUP_ORDER.map((group) => ({
    group,
    items: buckets.get(group)!,
  })).filter((g) => g.items.length > 0);
}

export function countAttentionItems(items: StoredFeedItem[]): number {
  return items.filter((i) => i.status === "new").length;
}

export function formatDisplayDate(date?: string): string | null {
  if (!date) return null;
  const d = new Date(date + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatDisplayTime(time?: string): string | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function canAddToCalendar(category: FeedCategory): boolean {
  return category === "event" || category === "deadline";
}

export const CATEGORY_STYLES: Record<
  FeedCategory,
  { bg: string; text: string; dot: string }
> = {
  event: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  deadline: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  action: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  change: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  money: { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500" },
  document: { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500" },
  announcement: { bg: "bg-slate-50", text: "text-slate-600", dot: "bg-slate-400" },
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}
