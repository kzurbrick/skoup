"use client";

import React, { useState } from "react";

export type Vibe = "Calm" | "Funny" | "Adventurous" | "Cozy";
export type Length = "Short" | "Medium";

export const VIBES: Vibe[] = ["Calm", "Funny", "Adventurous", "Cozy"];

export const LENGTH_OPTIONS: { value: Length; label: string; pages: number }[] = [
  { value: "Short", label: "Short (6 pages)", pages: 6 },
  { value: "Medium", label: "Medium (10 pages)", pages: 10 },
];

export const GENDER_EXPRESSIONS = ["Girl", "Boy", "Nonbinary", "Prefer not to say"] as const;
export const SKIN_TONES = [
  "Very fair",
  "Fair",
  "Light",
  "Medium",
  "Tan",
  "Brown",
  "Deep",
] as const;
export const HAIR_COLORS = [
  "Black",
  "Brown",
  "Blonde",
  "Red",
  "Auburn",
  "Gray",
  "White",
  "Other",
] as const;
export const HAIR_TYPES = ["Straight", "Wavy", "Curly", "Coily"] as const;
export const HAIR_LENGTHS = ["Very short", "Short", "Medium", "Long"] as const;

export const INTEREST_TOPICS = [
  "Animals",
  "Dinosaurs",
  "Space",
  "Princesses",
  "Superheroes",
  "Unicorns",
  "Trucks & Cars",
  "Trains",
  "Construction",
  "Sports",
  "Soccer",
  "Dance",
  "Music",
  "Art",
  "Magic",
  "Ocean",
  "Forest",
  "Robots",
  "Baking & Cooking",
  "Fairies",
] as const;

export type { GeneratedBook } from "@/types/book";

export type CharacterProfile = {
  genderExpression: string;
  skinTone: string;
  hairColor: string;
  hairType: string;
  hairLength: string;
  signatureDetail?: string;
};

export type GenerateBookError = { error: string; details?: string };

/* TEST ONLY – Remove before production: Long Text Mode appends this to every scene
   so scene-to-page splitting can be tested. Long enough to force multiple rendered pages. */
export const PAGINATION_TEST_FILLER =
  "Meanwhile the stars twinkled softly above. The gentle wind whispered through the trees, and somewhere far away a bird sang a quiet goodnight song. Everything was still and peaceful under the moon. The clouds drifted slowly across the sky like soft blankets. And so the night wrapped the world in calm and rest, and all was quiet and safe until morning.";

type CreateFormProps = {
  onSuccess?: (book: GeneratedBook) => void;
  onError?: (err: GenerateBookError) => void;
};

/** Build a single interests array from selected topics + other entries; de-dupe case-insensitive, trim, no empty. */
export function buildInterestsArray(
  selectedTopics: string[],
  otherInterests: string[]
): string[] {
  const combined = [...selectedTopics, ...otherInterests]
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  return combined.filter((s) => {
    const key = s.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function CreateForm({ onSuccess, onError }: CreateFormProps = {}) {
  const [childName, setChildName] = useState("");
  const [age, setAge] = useState<string>("");
  const [genderExpression, setGenderExpression] = useState<string>(GENDER_EXPRESSIONS[0]);
  const [skinTone, setSkinTone] = useState<string>(SKIN_TONES[0]);
  const [hairColor, setHairColor] = useState<string>(HAIR_COLORS[0]);
  const [hairType, setHairType] = useState<string>(HAIR_TYPES[0]);
  const [hairLength, setHairLength] = useState<string>(HAIR_LENGTHS[0]);
  const [signatureDetail, setSignatureDetail] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [otherInterests, setOtherInterests] = useState<string[]>([]);
  const [otherInput, setOtherInput] = useState("");
  const [vibe, setVibe] = useState<Vibe>("Calm");
  const [length, setLength] = useState<Length>("Short");
  const [isLoading, setIsLoading] = useState(false);
  /* TEST ONLY – Remove before production: when true, append long filler to each scene to test pagination. */
  const [longTextMode, setLongTextMode] = useState(false);

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const addOther = () => {
    const value = otherInput.trim();
    if (!value) return;
    setOtherInterests((prev) =>
      prev.includes(value) ? prev : [...prev, value]
    );
    setOtherInput("");
  };

  const removeOther = (index: number) => {
    setOtherInterests((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ageNum = age === "" ? undefined : Number(age);
    const interests = buildInterestsArray(selectedTopics, otherInterests);
    const characterProfile: CharacterProfile = {
      genderExpression,
      skinTone,
      hairColor,
      hairType,
      hairLength,
      ...(signatureDetail.trim() && { signatureDetail: signatureDetail.trim() }),
    };
    const body = {
      childName: childName.trim() || undefined,
      age: ageNum,
      characterProfile,
      interests: interests.length > 0 ? interests : undefined,
      vibe,
      length,
    };
    setIsLoading(true);
    try {
      const res = await fetch("/api/generate-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err: GenerateBookError = {
          error: typeof data?.error === "string" ? data.error : "Request failed",
          details: typeof data?.details === "string" ? data.details : undefined,
        };
        onError?.(err);
        return;
      }
      if (data?.title != null && Array.isArray(data?.pages)) {
        let bookToSave: GeneratedBook = { title: data.title, pages: data.pages };
        /* TEST ONLY – Remove before production: expand each scene with filler so pagination splitting is triggered. */
        if (longTextMode) {
          bookToSave = {
            title: data.title,
            pages: data.pages.map((p: { text: string }) => ({
              text: [p.text, PAGINATION_TEST_FILLER].filter(Boolean).join(" "),
            })),
          };
        }
        onSuccess?.(bookToSave);
      }
    } catch (err) {
      console.error(err);
      onError?.({
        error: "Request failed",
        details: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex max-w-md flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <h1 className="text-xl font-semibold text-zinc-800">Create a story</h1>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700">Child&apos;s name</span>
        <input
          type="text"
          value={childName}
          onChange={(e) => setChildName(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          placeholder="e.g. Sam"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700">Age</span>
        <input
          type="number"
          min={0}
          max={18}
          value={age}
          onChange={(e) => setAge(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          placeholder="e.g. 5"
        />
      </label>

      <div className="flex flex-col gap-3 rounded-lg border border-zinc-100 bg-zinc-50/50 p-4">
        <span className="text-sm font-medium text-zinc-700">Character</span>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-zinc-500">Gender expression</span>
          <select
            value={genderExpression}
            onChange={(e) => setGenderExpression(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          >
            {GENDER_EXPRESSIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-zinc-500">Skin tone</span>
          <select
            value={skinTone}
            onChange={(e) => setSkinTone(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          >
            {SKIN_TONES.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-zinc-500">Hair color</span>
          <select
            value={hairColor}
            onChange={(e) => setHairColor(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          >
            {HAIR_COLORS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-zinc-500">Hair type</span>
          <select
            value={hairType}
            onChange={(e) => setHairType(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          >
            {HAIR_TYPES.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-zinc-500">Hair length</span>
          <select
            value={hairLength}
            onChange={(e) => setHairLength(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          >
            {HAIR_LENGTHS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-zinc-500">Signature detail (optional)</span>
          <input
            type="text"
            value={signatureDetail}
            onChange={(e) => setSignatureDetail(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            placeholder="e.g. round glasses, freckles, sparkly headband"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-zinc-700">Interests</span>
        <div className="flex flex-wrap gap-2">
          {INTEREST_TOPICS.map((topic) => {
            const selected = selectedTopics.includes(topic);
            return (
              <label
                key={topic}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors hover:border-zinc-400 ${
                  selected
                    ? "border-zinc-600 bg-zinc-800 text-white"
                    : "border-zinc-300 text-zinc-800"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleTopic(topic)}
                  className="sr-only"
                />
                {topic}
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-zinc-700">Other interests</span>
        <div className="flex gap-2">
          <input
            type="text"
            value={otherInput}
            onChange={(e) => setOtherInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOther())}
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            placeholder="e.g. volcanoes"
          />
          <button
            type="button"
            onClick={addOther}
            className="shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          >
            Add
          </button>
        </div>
        {otherInterests.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {otherInterests.map((item, index) => (
              <span
                key={`${item}-${index}`}
                className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-800"
              >
                {item}
                <button
                  type="button"
                  onClick={() => removeOther(index)}
                  className="rounded-full p-0.5 hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                  aria-label={`Remove ${item}`}
                >
                  <span aria-hidden>×</span>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700">Vibe</span>
        <select
          value={vibe}
          onChange={(e) => setVibe(e.target.value as Vibe)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          {VIBES.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700">Length</span>
        <select
          value={length}
          onChange={(e) => setLength(e.target.value as Length)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          {LENGTH_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      {/* TEST ONLY – Remove before production: Long Text Mode for pagination testing. */}
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={longTextMode}
          onChange={(e) => setLongTextMode(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-300 text-zinc-800 focus:ring-zinc-500"
        />
        <span className="text-sm text-zinc-700">
          Long Text Mode (Pagination Test)
        </span>
      </label>

      <button
        type="submit"
        disabled={isLoading}
        className="mt-2 rounded-lg bg-zinc-800 px-4 py-2.5 font-medium text-white transition-colors hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Loading…" : "Submit"}
      </button>
    </form>
  );
}
