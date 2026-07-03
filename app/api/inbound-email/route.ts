import { NextRequest, NextResponse } from "next/server";
import { extractItemsFromEmail } from "@/lib/extractItems";

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

  const mailboxHash = payload.MailboxHash?.trim() || "";
  const to = payload.To?.trim() || payload.ToFull?.[0]?.Email || "";
  const from = senderFromPostmark(payload);
  const subject = payload.Subject?.trim() || "";
  const emailText = emailBodyFromPostmark(payload);

  if (!emailText) {
    console.warn("[inbound-email] No email body", {
      messageId: payload.MessageID,
      to,
      mailboxHash,
      subject,
    });
    return NextResponse.json({ ok: true, skipped: true, reason: "empty body" });
  }

  try {
    const items = await extractItemsFromEmail({
      emailText,
      subject: subject || undefined,
      sender: from,
      receivedDate: payload.Date,
    });

    console.log("[inbound-email] Processed", {
      messageId: payload.MessageID,
      mailboxHash: mailboxHash || "(none)",
      to,
      from,
      subject,
      itemCount: items.length,
      titles: items.map((item) => item.title),
    });

    // TODO: persist items for mailboxHash once auth + DB exist
    return NextResponse.json({
      ok: true,
      itemCount: items.length,
      mailboxHash: mailboxHash || null,
    });
  } catch (err) {
    console.error("[inbound-email] Extraction failed", {
      messageId: payload.MessageID,
      mailboxHash,
      to,
      subject,
      error: err instanceof Error ? err.message : "unknown",
    });
    // Return 200 so Postmark does not retry indefinitely on extraction errors.
    return NextResponse.json({ ok: false, error: "extraction failed" });
  }
}
