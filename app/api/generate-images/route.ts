import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

/** Prefer gpt-image-1.5; switch to gpt-image-1-mini for lower cost. */
const IMAGE_MODEL = "gpt-image-1.5";

const COVER_SIZE = "1024x1536" as const;
const SCENE_SIZE = "1024x1024" as const;

/** Appended to every prompt to enforce style and avoid text/logos. */
const PROMPT_SUFFIX = " no text, no logos, children's book illustration";

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

type GenerateImagesBody = {
  coverImagePrompt: string;
  sceneImagePrompts: string[];
  /** Prepended to every cover and scene prompt for consistent character appearance. */
  characterVisualCapsule?: string;
};

type FailureItem = {
  type: "cover" | "scene";
  index?: number;
  message: string;
};

function parseBody(raw: unknown): GenerateImagesBody | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.coverImagePrompt !== "string") return null;
  if (!Array.isArray(o.sceneImagePrompts)) return null;
  if (!o.sceneImagePrompts.every((p): p is string => typeof p === "string"))
    return null;
  const body: GenerateImagesBody = {
    coverImagePrompt: o.coverImagePrompt,
    sceneImagePrompts: o.sceneImagePrompts,
  };
  if (typeof o.characterVisualCapsule === "string" && o.characterVisualCapsule.trim()) {
    body.characterVisualCapsule = o.characterVisualCapsule.trim();
  }
  return body;
}

function errorResponse(
  error: string,
  details?: string,
  status: number = 500
): NextResponse {
  return NextResponse.json({ error, details }, { status });
}

/** Extract safe upstream error message (no secrets). Truncate and avoid leaking tokens. */
function getSafeUpstreamMessage(err: unknown): string {
  if (err instanceof Error) {
    const e = err as Error & { status?: number };
    const status = e.status != null ? String(e.status) : "";
    const msg = (e.message || "").slice(0, 300);
    if (status && msg) return `upstream status ${status}: ${msg}`;
    if (status) return `upstream status ${status}`;
    if (msg) return msg;
  }
  return "Unknown error";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Check if error is retryable (429, 500, or timeout/connection). */
function isRetryable(err: unknown): boolean {
  if (err instanceof Error) {
    const e = err as Error & { status?: number };
    if (e.status === 429 || (e.status != null && e.status >= 500)) return true;
    const msg = (e.message || "").toLowerCase();
    if (msg.includes("timeout") || msg.includes("connection") || msg.includes("econnreset"))
      return true;
  }
  return false;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    return errorResponse(
      "Image generation is not configured",
      "OPENAI_API_KEY is missing."
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request body", undefined, 400);
  }

  const parsed = parseBody(body);
  if (!parsed) {
    return errorResponse(
      "Invalid request body",
      "Expected { coverImagePrompt: string, sceneImagePrompts: string[] }.",
      400
    );
  }

  const coverTrimmed = parsed.coverImagePrompt.trim();
  const sceneTrimmed = parsed.sceneImagePrompts.map((p) => p.trim());

  const emptySceneIndexes = sceneTrimmed
    .map((p, i) => (p === "" ? i : -1))
    .filter((i) => i >= 0);

  const hasEmptyCover = coverTrimmed === "";
  const hasEmptyScenes = emptySceneIndexes.length > 0;

  console.log(
    "[generate-images] scene count:",
    sceneTrimmed.length,
    "empty scene indexes:",
    emptySceneIndexes.length ? emptySceneIndexes : "none",
    "cover empty:",
    hasEmptyCover
  );

  if (hasEmptyCover || hasEmptyScenes) {
    const parts: string[] = [];
    if (hasEmptyCover) parts.push("cover prompt is empty");
    if (hasEmptyScenes)
      parts.push(`empty or invalid prompts at scene indexes: ${emptySceneIndexes.join(", ")}`);
    return errorResponse(
      "Validation failed",
      parts.join("; "),
      400
    );
  }

  const openai = new OpenAI({ apiKey });
  const failures: FailureItem[] = [];
  const capsuleBlock = parsed.characterVisualCapsule?.trim() ?? "";

  const addSuffix = (p: string) => (p + PROMPT_SUFFIX).trim();

  const combineWithCapsule = (sceneOrCoverPrompt: string) => {
    const core = sceneOrCoverPrompt.trim();
    if (!capsuleBlock) return core;
    return `${capsuleBlock}\n\n${core}`;
  };

  const generateOne = async (
    prompt: string,
    size: typeof COVER_SIZE | typeof SCENE_SIZE,
    context: { type: "cover" | "scene"; index?: number }
  ): Promise<string | null> => {
    const fullPrompt = addSuffix(combineWithCapsule(prompt));
    let lastErr: unknown = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await openai.images.generate({
          model: IMAGE_MODEL,
          prompt: fullPrompt,
          size,
          n: 1,
        });
        const b64 = result.data?.[0]?.b64_json;
        if (typeof b64 !== "string") {
          throw new Error("Image API did not return base64 data.");
        }
        return b64;
      } catch (err) {
        lastErr = err;
        if (attempt < MAX_RETRIES && isRetryable(err)) {
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        break;
      }
    }
    const message = getSafeUpstreamMessage(lastErr);
    failures.push({
      type: context.type,
      index: context.index,
      message,
    });
    return null;
  };

  // Sequential generation: cover first, then each scene (throttle / rate-limit friendly).
  const coverB64 = await generateOne(coverTrimmed, COVER_SIZE, { type: "cover" });
  const coverImageBase64 = coverB64 ?? undefined;

  const sceneImageBase64: (string | null)[] = [];
  for (let i = 0; i < sceneTrimmed.length; i++) {
    const b64 = await generateOne(sceneTrimmed[i], SCENE_SIZE, {
      type: "scene",
      index: i,
    });
    sceneImageBase64.push(b64);
  }

  return NextResponse.json({
    coverImageBase64: coverImageBase64 ?? undefined,
    sceneImageBase64,
    failures,
  });
}
