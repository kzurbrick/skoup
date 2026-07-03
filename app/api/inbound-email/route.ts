import { NextRequest, NextResponse } from "next/server";
import { getFamilyByMailboxHash } from "@/lib/family";
import { extractItemsFromEmail } from "@/lib/extractItems";
import { feedItemToStoredFeedItem, storedFeedItemToRow } from "@/lib/feedDb";
import { createAdminClient } from "@/lib/supabase/admin";

type PostmarkInboundPayload = {
  From?: string;
  FromFull?: { Email?: string; Name?: string };
  To?: string;
  ToFull?: { Email?: string; Name?: string }[];
  Subject?: string;
  TextBody?: string;
  HtmlBody?: string;
  StrippedTextReply?: string;
  MailboxHash?: string;
  Date?: string;
  MessageID?: string;
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function emailBodyFromPostmark(payload: PostmarkInboundPayload): string {
  if (payload.TextBody?.trim()) return payload.TextBody.trim();
  if (payload.StrippedTextReply?.trim()) return payload.StrippedTextReply.trim();
  if (payload.HtmlBody?.trim()) return stripHtml(payload.HtmlBody);
  return "";
}

function senderFromPostmark(payload: PostmarkInboundPayload): string | undefined {
  if (payload.FromFull?.Email) {
    const name = payload.FromFull.Name?.trim();
    return name ? `${name} <${payload.FromFull.Email}>` : payload.FromFull.Email;
  }
  return payload.From?.trim() || undefined;
}

function mailboxHashFromPostmark(payload: PostmarkInboundPayload): string {
  if (payload.MailboxHash?.trim()) return payload.MailboxHash.trim().toLowerCase();

  const to = payload.To?.trim() || payload.ToFull?.[0]?.Email || "";
  const localPart = to.split("@")[0]?.trim().toLowerCase();
  return localPart || "";
}

function verifyWebhookAuth(request: NextRequest): boolean {
  const user = process.env.POSTMARK_INBOUND_WEBHOOK_USER;
  const pass = process.env.POSTMARK_INBOUND_WEBHOOK_PASSWORD;
  if (!user || !pass) return true;

  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) return false;

  const decoded = atob(auth.slice(6));
  const [providedUser, ...passParts] = decoded.split(":");
  return providedUser === user && passParts.join(":") === pass;
}

export async function POST(request: NextRequest) {
  if (!verifyWebhookAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: PostmarkInboundPayload;
  try {
    payload = await request.json();
  } catch {
    console.error("[inbound-email] Invalid JSON body");
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const mailboxHash = mailboxHashFromPostmark(payload);
  const to = payload.To?.trim() || payload.ToFull?.[0]?.Email || "";
  const from = senderFromPostmark(payload);
  const subject = payload.Subject?.trim() || "";
  const emailText = emailBodyFromPostmark(payload);

  if (!mailboxHash) {
    console.warn("[inbound-email] Missing mailbox hash", {
      messageId: payload.MessageID,
      to,
      subject,
    });
    return NextResponse.json({ ok: true, skipped: true, reason: "missing mailbox hash" });
  }

  if (!emailText) {
    console.warn("[inbound-email] No email body", {
      messageId: payload.MessageID,
      to,
      mailboxHash,
      subject,
    });
    return NextResponse.json({ ok: true, skipped: true, reason: "empty body" });
  }

  const family = await getFamilyByMailboxHash(mailboxHash);
  if (!family) {
    console.warn("[inbound-email] Unknown mailbox", {
      messageId: payload.MessageID,
      mailboxHash,
      to,
      subject,
    });
    return NextResponse.json({ ok: true, skipped: true, reason: "unknown mailbox" });
  }

  try {
    const extracted = await extractItemsFromEmail({
      emailText,
      subject: subject || undefined,
      sender: from,
      receivedDate: payload.Date,
    });

    const emailSource = {
      body: emailText,
      ...(subject ? { subject } : {}),
      ...(from ? { sender: from } : {}),
      ...(payload.Date ? { receivedDate: payload.Date } : {}),
    };

    const storedItems = extracted.map((item) =>
      feedItemToStoredFeedItem(item, emailSource)
    );

    const admin = createAdminClient();
    const rows = storedItems.map((item) => storedFeedItemToRow(item, family.familyId));
    const { error: insertError } = await admin.from("feed_items").insert(rows);

    if (insertError) throw insertError;

    console.log("[inbound-email] Processed", {
      messageId: payload.MessageID,
      mailboxHash,
      familyId: family.familyId,
      to,
      from,
      subject,
      itemCount: storedItems.length,
      titles: storedItems.map((item) => item.title),
    });

    return NextResponse.json({
      ok: true,
      itemCount: storedItems.length,
      mailboxHash,
      familyId: family.familyId,
    });
  } catch (err) {
    console.error("[inbound-email] Extraction failed", {
      messageId: payload.MessageID,
      mailboxHash,
      to,
      subject,
      error: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json({ ok: false, error: "extraction failed" });
  }
}
