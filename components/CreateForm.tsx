"use client";

import React, { useState } from "react";

type Vibe = "Calm" | "Funny" | "Adventurous" | "Cozy";
type Length = "Short" | "Medium";

const VIBES: Vibe[] = ["Calm", "Funny", "Adventurous", "Cozy"];

const LENGTH_OPTIONS: { value: Length; label: string; pages: number }[] = [
  { value: "Short", label: "Short (6 pages)", pages: 6 },
  { value: "Medium", label: "Medium (10 pages)", pages: 10 },
];

export type GeneratedBook = { title: string; pages: { text: string }[] };

type CreateFormProps = {
  onSuccess?: (book: GeneratedBook) => void;
};

export default function CreateForm({ onSuccess }: CreateFormProps = {}) {
  const [childName, setChildName] = useState("");
  const [age, setAge] = useState<string>("");
  const [interests, setInterests] = useState("");
  const [vibe, setVibe] = useState<Vibe>("Calm");
  const [length, setLength] = useState<Length>("Short");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ageNum = age === "" ? undefined : Number(age);
    const body = {
      childName: childName.trim() || undefined,
      age: ageNum,
      interests: interests.trim() || undefined,
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      console.log(data);
      if (data?.title != null && Array.isArray(data?.pages)) {
        onSuccess?.({ title: data.title, pages: data.pages });
      }
    } catch (err) {
      console.error(err);
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

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700">Interests (comma-separated)</span>
        <input
          type="text"
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          placeholder="e.g. dinosaurs, space, cats"
        />
      </label>

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
