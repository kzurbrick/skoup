import { NextRequest, NextResponse } from "next/server";

const PAGE_COUNT = { Short: 6, Medium: 10 } as const;

type Vibe = "Calm" | "Funny" | "Adventurous" | "Cozy";
type Length = "Short" | "Medium";

const VIBES: Vibe[] = ["Calm", "Funny", "Adventurous", "Cozy"];
const LENGTHS: Length[] = ["Short", "Medium"];

function parseBody(body: unknown): {
  childName: string;
  age: number | undefined;
  interests: string;
  vibe: Vibe;
  length: Length;
} {
  if (!body || typeof body !== "object") {
    return { childName: "", age: undefined, interests: "", vibe: "Calm", length: "Short" };
  }
  const b = body as Record<string, unknown>;
  const vibe = VIBES.includes(b.vibe as Vibe) ? (b.vibe as Vibe) : "Calm";
  const length = LENGTHS.includes(b.length as Length) ? (b.length as Length) : "Short";
  return {
    childName: typeof b.childName === "string" ? b.childName.trim() : "",
    age: typeof b.age === "number" && b.age >= 0 ? b.age : undefined,
    interests: typeof b.interests === "string" ? b.interests.trim() : "",
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
  interests: string,
  vibe: Vibe,
  pageCount: number
): { text: string }[] {
  const name = childName || "little one";
  const firstInterest = interests.split(",").map((s) => s.trim()).filter(Boolean)[0] || "dreaming";
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

  const pages: { text: string }[] = [];
  pages.push({ text: openings[vibe] });

  const middlePool = middles[vibe];
  const needed = pageCount - 2;
  for (let i = 0; i < needed; i++) {
    pages.push({ text: middlePool[i % middlePool.length] });
  }

  pages.push({ text: closings[vibe] });

  return pages;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { childName, age, interests, vibe, length } = parseBody(body);
    const pageCount = PAGE_COUNT[length];

    const title = getTitle(childName, vibe);
    const pages = generatePages(childName, age, interests, vibe, pageCount);

    return NextResponse.json({ title, pages });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
