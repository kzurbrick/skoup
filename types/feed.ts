export type FeedCategory =
  | "event"
  | "deadline"
  | "action"
  | "change"
  | "money"
  | "document"
  | "announcement";

export type FeedItemStatus = "new" | "done" | "dismissed";

export type FeedConfidence = "high" | "medium" | "low";

export type FeedItem = {
  id: string;
  category: FeedCategory;
  title: string;
  summary: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  amount?: string;
  actionRequired?: string;
  links?: string[];
  sourceExcerpt: string;
  confidence: FeedConfidence;
  status: FeedItemStatus;
};

export type EmailMetadata = {
  subject?: string;
  sender?: string;
  receivedDate?: string;
};

export type EmailSource = EmailMetadata & {
  body: string;
};

export type StoredFeedItem = FeedItem & {
  emailSource?: EmailSource;
};

export type DateGroup =
  | "Today"
  | "Tomorrow"
  | "This Week"
  | "Later"
  | "No Date";

export type GroupedFeed = {
  group: DateGroup;
  items: StoredFeedItem[];
};

export const CATEGORY_LABELS: Record<FeedCategory, string> = {
  event: "Event",
  deadline: "Deadline",
  action: "Action",
  change: "Change",
  money: "Money",
  document: "Document",
  announcement: "Announcement",
};
