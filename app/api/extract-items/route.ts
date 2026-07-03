import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { FeedCategory, FeedConfidence, FeedItem } from "@/types/feed";

type ExtractRequest = {
  emailText: string;
  subject?: string;
  sender?: string;
  receivedDate?: string;
};

const VALID_CATEGORIES: FeedCategory[] = [
  "event",
  "deadline",
  "action",
  "change",
  "money",
  "document",
  "announcement",
];

const VALID_CONFIDENCE: FeedConfidence[] = ["high", "medium", "low"];

const SYSTEM_PROMPT = `You are Skoup, an AI assistant that helps busy parents extract actionable information from school and activity emails.

Extract only useful parent-facing information into structured feed cards. Rules:
- Do NOT create a card for every sentence. Prefer fewer, higher-value cards.
- If an email contains a schedule, create separate event cards only when dates/times are clear.
- Schedule changes → category "change"
- Due dates → category "deadline"
- Parent must do something → category "action"
- Payment mentioned → category "money"
- Forms, waivers, attachments, links → category "document"
- Useful but not actionable → category "announcement"
- Events with specific date/time → category "event"
- Include sourceExcerpt (exact quote from email) so the parent can verify each card.
- If date is unclear, leave date blank and explain in summary.
- Use ISO date format (YYYY-MM-DD) for dates.
- Use 24-hour HH:MM format for times.
- confidence: "high" if clearly stated, "medium" if inferred, "low" if uncertain.

Return a JSON object: { "items": [ ... ] }
Each item must have: category, title, summary, sourceExcerpt, confidence
Optional fields: date, startTime, endTime, location, amount, actionRequired, links (string array)`;

function errorResponse(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

function sanitizeItem(raw: Record<string, unknown>, index: number): FeedItem | null {
  const category = raw.category as string;
  const confidence = raw.confidence as string;

  if (!VALID_CATEGORIES.includes(category as FeedCategory)) return null;
  if (!VALID_CONFIDENCE.includes(confidence as FeedConfidence)) return null;
  if (typeof raw.title !== "string" || !raw.title.trim()) return null;
  if (typeof raw.summary !== "string" || !raw.summary.trim()) return null;
  if (typeof raw.sourceExcerpt !== "string" || !raw.sourceExcerpt.trim()) return null;

  return {
    id: `extracted-${Date.now()}-${index}`,
    category: category as FeedCategory,
    title: raw.title.trim(),
    summary: raw.summary.trim(),
    sourceExcerpt: raw.sourceExcerpt.trim(),
    confidence: confidence as FeedConfidence,
    status: "new",
    ...(typeof raw.date === "string" && raw.date ? { date: raw.date } : {}),
    ...(typeof raw.startTime === "string" && raw.startTime
      ? { startTime: raw.startTime }
      : {}),
    ...(typeof raw.endTime === "string" && raw.endTime ? { endTime: raw.endTime } : {}),
    ...(typeof raw.location === "string" && raw.location
      ? { location: raw.location }
      : {}),
    ...(typeof raw.amount === "string" && raw.amount ? { amount: raw.amount } : {}),
    ...(typeof raw.actionRequired === "string" && raw.actionRequired
      ? { actionRequired: raw.actionRequired }
      : {}),
    ...(Array.isArray(raw.links)
      ? { links: raw.links.filter((l): l is string => typeof l === "string") }
      : {}),
  };
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    return errorResponse(
      "Extraction is not configured. Set OPENAI_API_KEY in your environment.",
      503
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request body", 400);
  }

  const { emailText, subject, sender, receivedDate } = body as ExtractRequest;
  if (!emailText || typeof emailText !== "string" || !emailText.trim()) {
    return errorResponse("emailText is required", 400);
  }

  const contextParts: string[] = [];
  if (subject) contextParts.push(`Subject: ${subject}`);
  if (sender) contextParts.push(`From: ${sender}`);
  if (receivedDate) contextParts.push(`Received: ${receivedDate}`);
  contextParts.push("", "Email body:", emailText.trim());

  const userMessage = contextParts.join("\n");

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return errorResponse("No response from AI", 502);
    }

    let parsed: { items?: unknown[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      return errorResponse("Failed to parse AI response", 502);
    }

    const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
    const items = rawItems
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item, i) => sanitizeItem(item, i))
      .filter((item): item is FeedItem => item !== null);

    return NextResponse.json({ items });
  } catch (err) {
    console.error("[extract-items]", err);
    const message = err instanceof Error ? err.message : "Extraction failed";
    return errorResponse(message, 500);
  }
}
