import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { BookPage, GeneratedBook } from "@/types/book";
import { buildCharacterVisualCapsule } from "@/lib/characterVisualCapsule";

const PAGE_COUNT = { Short: 6, Medium: 10 } as const;

/** Appended to every cover and page image prompt for consistent style. */
const IMAGE_STYLE_SUFFIX =
  " Playful children's book illustration, soft watercolor/gouache, warm lighting, rounded shapes, gentle expressions, no text in the image.";

type Vibe = "Calm" | "Funny" | "Adventurous" | "Cozy";
type Length = "Short" | "Medium";

const VIBES: Vibe[] = ["Calm", "Funny", "Adventurous", "Cozy"];
const LENGTHS: Length[] = ["Short", "Medium"];

export type CharacterProfile = {
  genderExpression: string;
  skinTone: string;
  hairColor: string;
  hairType: string;
  hairLength: string;
  signatureDetail?: string;
};

const DEFAULT_CHARACTER_PROFILE: CharacterProfile = {
  genderExpression: "Prefer not to say",
  skinTone: "Medium",
  hairColor: "Brown",
  hairType: "Straight",
  hairLength: "Medium",
};


/** Normalize interests to string[]; accept string (legacy) or string[]. De-dupe case-insensitively. */
function normalizeInterests(raw: unknown): string[] {
  let items: string[] = [];
  if (typeof raw === "string") {
    items = raw.split(",").map((s) => s.trim()).filter(Boolean);
  } else if (Array.isArray(raw)) {
    items = raw
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const seen = new Set<string>();
  return items.filter((s) => {
    const key = s.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseCharacterProfile(raw: unknown): CharacterProfile {
  if (!raw || typeof raw !== "object") return DEFAULT_CHARACTER_PROFILE;
  const o = raw as Record<string, unknown>;
  return {
    genderExpression:
      typeof o.genderExpression === "string" ? o.genderExpression.trim() : DEFAULT_CHARACTER_PROFILE.genderExpression,
    skinTone: typeof o.skinTone === "string" ? o.skinTone.trim() : DEFAULT_CHARACTER_PROFILE.skinTone,
    hairColor: typeof o.hairColor === "string" ? o.hairColor.trim() : DEFAULT_CHARACTER_PROFILE.hairColor,
    hairType: typeof o.hairType === "string" ? o.hairType.trim() : DEFAULT_CHARACTER_PROFILE.hairType,
    hairLength: typeof o.hairLength === "string" ? o.hairLength.trim() : DEFAULT_CHARACTER_PROFILE.hairLength,
    signatureDetail:
      typeof o.signatureDetail === "string" && o.signatureDetail.trim()
        ? o.signatureDetail.trim()
        : undefined,
  };
}

function parseBody(body: unknown): {
  childName: string;
  age: number | undefined;
  characterProfile: CharacterProfile;
  interests: string[];
  vibe: Vibe;
  length: Length;
} {
  if (!body || typeof body !== "object") {
    return {
      childName: "",
      age: undefined,
      characterProfile: DEFAULT_CHARACTER_PROFILE,
      interests: [],
      vibe: "Calm",
      length: "Short",
    };
  }
  const b = body as Record<string, unknown>;
  const vibe = VIBES.includes(b.vibe as Vibe) ? (b.vibe as Vibe) : "Calm";
  const length = LENGTHS.includes(b.length as Length) ? (b.length as Length) : "Short";
  return {
    childName: typeof b.childName === "string" ? b.childName.trim() : "",
    age: typeof b.age === "number" && b.age >= 0 ? b.age : undefined,
    characterProfile: parseCharacterProfile(b.characterProfile),
    interests: normalizeInterests(b.interests),
    vibe,
    length,
  };
}

function getTitle(childName: string, vibe: Vibe): string {
  const name = childName || "Little One";
  const titles: Record<Vibe, string> = {
    Calm: `A Calm Night for ${name}`,
    Funny: `${name}'s Funny Bedtime`,
    Adventurous: `${name}'s Small Adventure`,
    Cozy: `Cozy Time for ${name}`,
  };
  return titles[vibe];
}

function generatePages(
  childName: string,
  age: number | undefined,
  interests: string[],
  vibe: Vibe,
  pageCount: number
): BookPage[] {
  const name = childName || "little one";
  const firstInterest = interests[0] || "dreaming";
  const ageLine = age != null && age > 0 ? ` You are ${age} years old.` : "";

  const openings: Record<Vibe, string> = {
    Calm: `The stars are out, ${name}.${ageLine} Tonight we'll drift off gently.`,
    Funny: `Hey ${name}!${ageLine} Time for a silly story before sleep.`,
    Adventurous: `${name}, close your eyes.${ageLine} A tiny adventure is waiting.`,
    Cozy: `Snuggle in, ${name}.${ageLine} Here's a warm story just for you.`,
  };

  const middles: Record<Vibe, string[]> = {
    Calm: [
      `You think about ${firstInterest}. It feels peaceful.`,
      `Your breath goes in and out, slow and steady.`,
      `The moon watches over you. Everything is quiet.`,
      `You feel safe and still.`,
      `The night is soft and kind.`,
    ],
    Funny: [
      `Imagine ${firstInterest} wearing a tiny hat. Silly!`,
      `Everything is a little topsy-turvy in dreamland.`,
      `You might giggle in your sleep tonight.`,
      `Even the moon is smiling.`,
      `Tomorrow you can tell someone this silly story.`,
    ],
    Adventurous: [
      `In your mind, you go to a place full of ${firstInterest}.`,
      `You're brave and curious. One step, then another.`,
      `Something wonderful is just around the corner.`,
      `You discover a little secret the night saved for you.`,
      `The adventure is gentle and safe.`,
    ],
    Cozy: [
      `Think of ${firstInterest} while you're under the covers.`,
      `The room is warm. You're wrapped in softness.`,
      `Like a hug in story form.`,
      `Nothing to do but rest and listen.`,
      `This moment is just for you.`,
    ],
  };

  const closings: Record<Vibe, string> = {
    Calm: `Rest now, ${name}. Sweet dreams.`,
    Funny: `Goodnight, ${name}. Dream something silly.`,
    Adventurous: `Goodnight, ${name}. Adventure waits in your dreams.`,
    Cozy: `Goodnight, ${name}. Stay cozy.`,
  };

  const toImagePrompt = (text: string) =>
    text.slice(0, 120).trim().replace(/\s+/g, " ") + IMAGE_STYLE_SUFFIX;

  const pages: BookPage[] = [];
  const openText = openings[vibe];
  pages.push({ text: openText, imagePrompt: toImagePrompt(openText) });

  const middlePool = middles[vibe];
  const needed = pageCount - 2;
  for (let i = 0; i < needed; i++) {
    const text = middlePool[i % middlePool.length];
    pages.push({ text, imagePrompt: toImagePrompt(text) });
  }

  const closeText = closings[vibe];
  pages.push({ text: closeText, imagePrompt: toImagePrompt(closeText) });

  return pages;
}

function withCharacterVisualCapsule(
  book: GeneratedBook,
  characterProfile: CharacterProfile,
  childName: string,
  age: number | undefined
): GeneratedBook {
  return {
    ...book,
    characterVisualCapsule: buildCharacterVisualCapsule(characterProfile, {
      childName: childName || undefined,
      age,
    }),
  };
}

/** Deterministic mock book (used when Claude is unavailable or response is invalid). */
function getMockBook(
  childName: string,
  age: number | undefined,
  interests: string[],
  vibe: Vibe,
  length: Length,
  characterProfile: CharacterProfile
): GeneratedBook {
  const pageCount = PAGE_COUNT[length];
  const title = getTitle(childName, vibe);
  const name = childName || "a child";
  const coverImagePrompt = `Bedtime story book cover: ${name} and a cozy, gentle scene reflecting the story.${IMAGE_STYLE_SUFFIX}`;
  const book: GeneratedBook = {
    title,
    coverImagePrompt,
    pages: generatePages(childName, age, interests, vibe, pageCount),
  };
  return withCharacterVisualCapsule(book, characterProfile, childName, age);
}

function isValidBook(
  data: unknown,
  requiredPageCount: number
): data is GeneratedBook {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  if (typeof o.title !== "string") return false;
  if (typeof o.coverImagePrompt !== "string") return false;
  if (!Array.isArray(o.pages)) return false;
  if (o.pages.length !== requiredPageCount) return false;
  return o.pages.every(
    (p): p is BookPage =>
      p != null &&
      typeof p === "object" &&
      "text" in p &&
      typeof (p as { text: unknown }).text === "string" &&
      "imagePrompt" in p &&
      typeof (p as { imagePrompt: unknown }).imagePrompt === "string"
  );
}

type ClaudeResult =
  | { success: true; book: GeneratedBook }
  | { success: false; error: string; details?: string };

/** Extract JSON from Claude response (may be wrapped in markdown code block). */
function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const codeBlock = /^```(?:json)?\s*([\s\S]*?)```\s*$/;
  const match = trimmed.match(codeBlock);
  const raw = match ? match[1].trim() : trimmed;
  return JSON.parse(raw) as unknown;
}

async function generateWithClaude(
  childName: string,
  age: number | undefined,
  characterProfile: CharacterProfile,
  interests: string[],
  vibe: Vibe,
  pageCount: number
): Promise<ClaudeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey?.trim()) {
    return {
      success: false,
      error: "Story generation is not configured",
      details: "API key is missing.",
    };
  }

  const name = childName || "the child";
  const interestList =
    interests.length > 0 ? interests.join(", ") : "gentle dreams";

  const systemPrompt = `Bedtime Story Generator

You are an expert children's author who writes emotionally rich, gentle, personalized bedtime stories.

Your goal is to create a complete, coherent children's storybook that helps a child feel safe, confident, and relaxed before sleep.

Output Rules (Mandatory)

Return ONLY valid JSON.

Do NOT include markdown, commentary, or extra text.

JSON must follow this exact structure:

{ "title": string, "coverImagePrompt": string, "pages": [{ "text": string, "imagePrompt": string }] }

The pages array must contain exactly the requested number of pages (6 or 10).

Image prompt rules (required):

Include "coverImagePrompt": composition for the book cover — setting, mood, and what is happening (e.g. the child with a helper in a cozy moment). Do NOT repeat detailed hair, skin, or outfit; say "the child" or use the child's name for identity only.

Include "imagePrompt" on every page: describe ONLY this page's scene — setting, action, mood, and any helper or props. Refer to the main character as "the child" or by name; do NOT re-list gender expression, skin tone, or hair details (those are supplied separately for the image generator).

Every image prompt (cover and each page) must use this exact visual style. Append this phrase to each prompt you write: "Playful children's book illustration, soft watercolor/gouache, warm lighting, rounded shapes, gentle expressions, no text in the image."

Do not generate or include any image URLs.

Personalization Rules

The child's name must appear naturally throughout the story.

At least one interest must meaningfully influence the setting, characters, or plot.

The story should feel written specifically for this child.

Age Adaptation Rules

Adjust vocabulary, sentence length, emotional complexity, and pacing based on age:

Ages 3–5

Very simple language

Short sentences

Repetition and rhythm

Focus on comfort and familiarity

Ages 6–8

Moderate vocabulary

Clear emotional journey

Light curiosity and problem-solving

Friendly helper characters

Ages 9–11

Richer language

Deeper reflection

More complex emotions

Stronger sense of independence

Narrative Structure (Required)

Follow this story arc exactly:

Gentle Introduction (setting + desire)

Small Emotional Problem

First Attempt

Helper Interaction

Emotional Insight

Warm Resolution

Bedtime Return

If more than 6 pages are requested, expand this structure proportionally while preserving the same arc.

Helper Character Rules

Create one consistent helper character.

Give them a gentle personality and recognizable voice.

They must appear in multiple pages.

They should support, not solve, the problem alone.

Emotional Tone Rules

No violence, fear, threats, or villains.

No shame, ridicule, or punishment.

All challenges are emotional or curiosity-based.

Tone must always feel safe and comforting.

Page Writing Rules

Each page must advance the story.

Avoid filler.

Maintain continuity.

1–3 sentences/paragraphs per page (age-dependent).

Ending Rules

End with physical relaxation (yawning, snuggling, slow breathing).

Reinforce safety and belonging.

Never end abruptly.`;

  const characterLines = [
    `Gender expression: ${characterProfile.genderExpression}`,
    `Skin tone: ${characterProfile.skinTone}`,
    `Hair: ${characterProfile.hairColor}, ${characterProfile.hairType}, ${characterProfile.hairLength}`,
    ...(characterProfile.signatureDetail
      ? [`Signature detail: ${characterProfile.signatureDetail}`]
      : []),
  ].join("\n");

  const userPrompt = `Write a bedtime story with exactly ${pageCount} pages. Return only the JSON object: { "title": string, "coverImagePrompt": string, "pages": [{ "text": string, "imagePrompt": string }, ...] } with exactly ${pageCount} items in pages. Every coverImagePrompt and every page's imagePrompt must end with: "Playful children's book illustration, soft watercolor/gouache, warm lighting, rounded shapes, gentle expressions, no text in the image."

Child's name: ${name}
Age: ${age != null && age > 0 ? age : "not specified"}
Interests: ${interestList}
Vibe/tone: ${vibe}

Character (for natural, inclusive reference in the story and consistent description; avoid stereotypes):
${characterLines}

Refer to the child in the story in a way that feels natural and affirming. Do not rely on stereotypes.`;

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const rawText = message.content
      ?.filter((b) => b.type === "text")
      .map((b) => ("text" in b ? b.text : ""))
      .find((t) => t.length > 0);
    if (!rawText) {
      return {
        success: false,
        error: "Story generation failed",
        details: "No text in the response.",
      };
    }

    let parsed: unknown;
    try {
      parsed = extractJson(rawText);
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : "Invalid JSON";
      return {
        success: false,
        error: "Invalid story response",
        details: msg,
      };
    }

    if (!isValidBook(parsed, pageCount)) {
      return {
        success: false,
        error: "Invalid story format",
        details: `Expected title, coverImagePrompt, and exactly ${pageCount} pages with "text" and "imagePrompt" each.`,
      };
    }

    const book = withCharacterVisualCapsule(
      parsed as GeneratedBook,
      characterProfile,
      childName,
      age
    );
    return { success: true, book };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      success: false,
      error: "Story generation failed",
      details: message,
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { childName, age, characterProfile, interests, vibe, length } = parseBody(body);
    const pageCount = PAGE_COUNT[length];

    const result = await generateWithClaude(
      childName,
      age,
      characterProfile,
      interests,
      vibe,
      pageCount
    );

    if (result.success) {
      return NextResponse.json(result.book);
    }

    return NextResponse.json(
      { error: result.error, details: result.details },
      { status: 500 }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
