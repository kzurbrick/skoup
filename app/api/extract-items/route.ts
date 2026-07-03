import { NextRequest, NextResponse } from "next/server";
import { extractItemsFromEmail } from "@/lib/extractItems";

type ExtractRequest = {
  emailText: string;
  subject?: string;
  sender?: string;
  receivedDate?: string;
};

function errorResponse(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY?.trim()) {
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

  try {
    const items = await extractItemsFromEmail({
      emailText,
      subject,
      sender,
      receivedDate,
    });
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[extract-items]", err);
    const message = err instanceof Error ? err.message : "Extraction failed";
    return errorResponse(message, 500);
  }
}
