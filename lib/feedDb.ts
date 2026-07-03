import type { FeedItem, StoredFeedItem } from "@/types/feed";

export type FeedItemRow = {
  id: string;
  family_id: string;
  category: string;
  title: string;
  summary: string;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  amount: string | null;
  action_required: string | null;
  links: string[] | null;
  source_excerpt: string;
  confidence: string;
  status: string;
  email_subject: string | null;
  email_sender: string | null;
  email_received_date: string | null;
  email_body: string | null;
  created_at: string;
  updated_at: string;
};

export function rowToStoredFeedItem(row: FeedItemRow): StoredFeedItem {
  const item: StoredFeedItem = {
    id: row.id,
    category: row.category as StoredFeedItem["category"],
    title: row.title,
    summary: row.summary,
    sourceExcerpt: row.source_excerpt,
    confidence: row.confidence as StoredFeedItem["confidence"],
    status: row.status as StoredFeedItem["status"],
  };

  if (row.date) item.date = row.date;
  if (row.start_time) item.startTime = row.start_time;
  if (row.end_time) item.endTime = row.end_time;
  if (row.location) item.location = row.location;
  if (row.amount) item.amount = row.amount;
  if (row.action_required) item.actionRequired = row.action_required;
  if (row.links?.length) item.links = row.links;

  if (row.email_body || row.email_subject || row.email_sender || row.email_received_date) {
    item.emailSource = {
      body: row.email_body ?? "",
      ...(row.email_subject ? { subject: row.email_subject } : {}),
      ...(row.email_sender ? { sender: row.email_sender } : {}),
      ...(row.email_received_date ? { receivedDate: row.email_received_date } : {}),
    };
  }

  return item;
}

export function storedFeedItemToRow(
  item: StoredFeedItem,
  familyId: string
): Omit<FeedItemRow, "id" | "created_at" | "updated_at"> {
  return {
    family_id: familyId,
    category: item.category,
    title: item.title,
    summary: item.summary,
    date: item.date ?? null,
    start_time: item.startTime ?? null,
    end_time: item.endTime ?? null,
    location: item.location ?? null,
    amount: item.amount ?? null,
    action_required: item.actionRequired ?? null,
    links: item.links ?? null,
    source_excerpt: item.sourceExcerpt,
    confidence: item.confidence,
    status: item.status,
    email_subject: item.emailSource?.subject ?? null,
    email_sender: item.emailSource?.sender ?? null,
    email_received_date: item.emailSource?.receivedDate ?? null,
    email_body: item.emailSource?.body ?? null,
  };
}

export function partialFeedItemToRow(
  updates: Partial<StoredFeedItem>
): Partial<FeedItemRow> {
  const row: Partial<FeedItemRow> = {};

  if (updates.category !== undefined) row.category = updates.category;
  if (updates.title !== undefined) row.title = updates.title;
  if (updates.summary !== undefined) row.summary = updates.summary;
  if (updates.date !== undefined) row.date = updates.date ?? null;
  if (updates.startTime !== undefined) row.start_time = updates.startTime ?? null;
  if (updates.endTime !== undefined) row.end_time = updates.endTime ?? null;
  if (updates.location !== undefined) row.location = updates.location ?? null;
  if (updates.amount !== undefined) row.amount = updates.amount ?? null;
  if (updates.actionRequired !== undefined) {
    row.action_required = updates.actionRequired ?? null;
  }
  if (updates.links !== undefined) row.links = updates.links ?? null;
  if (updates.sourceExcerpt !== undefined) row.source_excerpt = updates.sourceExcerpt;
  if (updates.confidence !== undefined) row.confidence = updates.confidence;
  if (updates.status !== undefined) row.status = updates.status;

  if (updates.emailSource !== undefined) {
    row.email_subject = updates.emailSource?.subject ?? null;
    row.email_sender = updates.emailSource?.sender ?? null;
    row.email_received_date = updates.emailSource?.receivedDate ?? null;
    row.email_body = updates.emailSource?.body ?? null;
  }

  return row;
}

export function feedItemToStoredFeedItem(item: FeedItem, emailSource?: StoredFeedItem["emailSource"]): StoredFeedItem {
  return {
    ...item,
    ...(emailSource ? { emailSource } : {}),
  };
}
