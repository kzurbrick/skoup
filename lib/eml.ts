import type { EmailMetadata } from "@/types/feed";

export function parseEmlFile(content: string): {
  metadata: EmailMetadata;
  body: string;
} {
  const normalized = content.replace(/\r\n/g, "\n");
  const headerBodySplit = normalized.indexOf("\n\n");

  if (headerBodySplit === -1) {
    return { metadata: {}, body: normalized.trim() };
  }

  const headerSection = normalized.slice(0, headerBodySplit);
  const rawBody = normalized.slice(headerBodySplit + 2);

  const headers = unfoldHeaders(headerSection);
  const metadata: EmailMetadata = {
    subject: headers["subject"],
    sender: headers["from"],
    receivedDate: headers["date"],
  };

  const contentType = headers["content-type"] ?? "text/plain";
  const boundaryMatch = contentType.match(/boundary="?([^";\s]+)"?/i);
  let body = rawBody;

  if (boundaryMatch) {
    body = extractFromMultipart(rawBody, boundaryMatch[1]);
  } else if (contentType.includes("text/html")) {
    body = stripHtml(rawBody);
  }

  return { metadata, body: decodeBody(body).trim() };
}

function unfoldHeaders(headerSection: string): Record<string, string> {
  const lines = headerSection.split("\n");
  const unfolded: string[] = [];
  for (const line of lines) {
    if (/^\s/.test(line) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += " " + line.trim();
    } else {
      unfolded.push(line);
    }
  }

  const headers: Record<string, string> = {};
  for (const line of unfolded) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    headers[key] = decodeHeaderValue(value);
  }
  return headers;
}

function decodeHeaderValue(value: string): string {
  return value
    .replace(/=\?([^?]+)\?([BQbq])\?([^?]+)\?=/g, (_, _charset, encoding, text) => {
      if (encoding.toUpperCase() === "B") {
        try {
          return atob(text.replace(/\s/g, ""));
        } catch {
          return text;
        }
      }
      return text.replace(/=([0-9A-Fa-f]{2})/g, (_m: string, hex: string) =>
        String.fromCharCode(parseInt(hex, 16))
      );
    })
    .replace(/^"|"$/g, "");
}

function extractFromMultipart(rawBody: string, boundary: string): string {
  const parts = rawBody.split(`--${boundary}`);
  let plainText = "";
  let htmlText = "";

  for (const part of parts) {
    if (!part.trim() || part.trim() === "--") continue;
    const partSplit = part.indexOf("\n\n");
    if (partSplit === -1) continue;

    const partHeaders = unfoldHeaders(part.slice(0, partSplit));
    const partBody = part.slice(partSplit + 2).replace(/\n--$/, "").trim();
    const partType = partHeaders["content-type"] ?? "";

    if (partType.includes("text/plain") && !plainText) {
      plainText = decodeBody(partBody, partHeaders["content-transfer-encoding"]);
    } else if (partType.includes("text/html") && !htmlText) {
      htmlText = stripHtml(
        decodeBody(partBody, partHeaders["content-transfer-encoding"])
      );
    }
  }

  return plainText || htmlText || rawBody.trim();
}

function decodeBody(body: string, encoding?: string): string {
  const enc = (encoding ?? "").toLowerCase();
  if (enc === "base64") {
    try {
      return atob(body.replace(/\s/g, ""));
    } catch {
      return body;
    }
  }
  if (enc === "quoted-printable") {
    return body
      .replace(/=\r?\n/g, "")
      .replace(/=([0-9A-Fa-f]{2})/g, (_m, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      );
  }
  return body;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
