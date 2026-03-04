"use client";

import React, { useState } from "react";
import {
  type GeneratedBook,
  type GenerateBookError,
  type CharacterProfile,
  type Vibe,
  type Length,
  buildInterestsArray,
  PAGINATION_TEST_FILLER,
  VIBES,
  LENGTH_OPTIONS,
  GENDER_EXPRESSIONS,
  SKIN_TONES,
  HAIR_COLORS,
  HAIR_TYPES,
  HAIR_LENGTHS,
  INTEREST_TOPICS,
} from "@/components/CreateForm";

const TOTAL_STEPS = 5;

export type WizardFormState = {
  childName: string;
  age: string;
  vibe: Vibe;
  length: Length;
  selectedTopics: string[];
  otherInterests: string[];
  otherInput: string;
  genderExpression: string;
  skinTone: string;
  hairColor: string;
  hairType: string;
  hairLength: string;
  signatureDetail: string;
  longTextMode: boolean;
};

const initialState: WizardFormState = {
  childName: "",
  age: "",
  vibe: "Calm",
  length: "Short",
  selectedTopics: [],
  otherInterests: [],
  otherInput: "",
  genderExpression: GENDER_EXPRESSIONS[0],
  skinTone: SKIN_TONES[0],
  hairColor: HAIR_COLORS[0],
  hairType: HAIR_TYPES[0],
  hairLength: HAIR_LENGTHS[0],
  signatureDetail: "",
  longTextMode: false,
};

function canProceed(step: number, state: WizardFormState): boolean {
  switch (step) {
    case 0:
      return state.childName.trim().length > 0;
    case 1:
    case 2:
    case 3:
      return true;
    default:
      return false;
  }
}

type CreateWizardProps = {
  onSuccess?: (book: GeneratedBook) => void;
  onError?: (err: GenerateBookError) => void;
};

export default function CreateWizard({ onSuccess, onError }: CreateWizardProps = {}) {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardFormState>(initialState);
  const [isLoading, setIsLoading] = useState(false);

  const update = (patch: Partial<WizardFormState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  };

  const toggleTopic = (topic: string) => {
    setState((prev) => ({
      ...prev,
      selectedTopics: prev.selectedTopics.includes(topic)
        ? prev.selectedTopics.filter((t) => t !== topic)
        : [...prev.selectedTopics, topic],
    }));
  };

  const addOther = () => {
    const value = state.otherInput.trim();
    if (!value) return;
    setState((prev) => ({
      ...prev,
      otherInterests: prev.otherInterests.includes(value) ? prev.otherInterests : [...prev.otherInterests, value],
      otherInput: "",
    }));
  };

  const removeOther = (index: number) => {
    setState((prev) => ({
      ...prev,
      otherInterests: prev.otherInterests.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    const ageNum = state.age === "" ? undefined : Number(state.age);
    const interests = buildInterestsArray(state.selectedTopics, state.otherInterests);
    const characterProfile: CharacterProfile = {
      genderExpression: state.genderExpression,
      skinTone: state.skinTone,
      hairColor: state.hairColor,
      hairType: state.hairType,
      hairLength: state.hairLength,
      ...(state.signatureDetail.trim() && { signatureDetail: state.signatureDetail.trim() }),
    };
    const body = {
      childName: state.childName.trim() || undefined,
      age: ageNum,
      characterProfile,
      interests: interests.length > 0 ? interests : undefined,
      vibe: state.vibe,
      length: state.length,
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
        onError?.({
          error: typeof data?.error === "string" ? data.error : "Request failed",
          details: typeof data?.details === "string" ? data.details : undefined,
        });
        return;
      }
      if (data?.title != null && Array.isArray(data?.pages)) {
        const bookToSave: GeneratedBook = {
          ...data,
          title: data.title,
          pages: data.pages.map((p: Record<string, unknown>) =>
            state.longTextMode
              ? { ...p, text: [String(p.text ?? ""), PAGINATION_TEST_FILLER].filter(Boolean).join(" ") }
              : { ...p, text: String(p.text ?? "") }
          ),
        };
        onSuccess?.(bookToSave);
      }
    } catch (err) {
      onError?.({
        error: "Request failed",
        details: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const goToStep = (s: number) => setStep(Math.max(0, Math.min(s, TOTAL_STEPS - 1)));

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/80 via-white to-sky-50/60 px-4 py-6 font-sans sm:py-10">
      <div className="mx-auto max-w-lg">
        <div className="overflow-hidden rounded-3xl border border-amber-100/80 bg-white/95 shadow-xl shadow-amber-900/5">
          <div className="border-b border-zinc-100 bg-zinc-50/70 px-6 py-4">
            <p className="text-center text-sm font-medium text-zinc-500">
              Step {step + 1} of {TOTAL_STEPS}
            </p>
            <div className="mt-2 flex justify-center gap-2" aria-hidden>
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <span
                  key={i}
                  className={`h-2 w-2 rounded-full transition-all duration-300 ${
                    i < step ? "scale-110 bg-amber-500" : i === step ? "scale-125 bg-amber-400" : "bg-zinc-200"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="min-h-[320px] p-6 sm:p-8">
            {step === 0 && (
              <>
                <h2 className="mb-6 text-xl font-bold text-zinc-800 sm:text-2xl">
                  Who is this story for? 👋
                </h2>
                <div className="space-y-5">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-zinc-700">Child&apos;s name</span>
                    <input
                      type="text"
                      value={state.childName}
                      onChange={(e) => update({ childName: e.target.value })}
                      className="rounded-xl border-2 border-zinc-200 px-4 py-3 text-zinc-900 transition-colors focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                      placeholder="e.g. Sam"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-zinc-700">Age</span>
                    <input
                      type="number"
                      min={0}
                      max={18}
                      value={state.age}
                      onChange={(e) => update({ age: e.target.value })}
                      className="rounded-xl border-2 border-zinc-200 px-4 py-3 text-zinc-900 transition-colors focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                      placeholder="e.g. 5"
                    />
                  </label>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h2 className="mb-6 text-xl font-bold text-zinc-800 sm:text-2xl">
                  Story mood & length 📖
                </h2>
                <div className="space-y-5">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-zinc-700">Vibe</span>
                    <select
                      value={state.vibe}
                      onChange={(e) => update({ vibe: e.target.value as Vibe })}
                      className="rounded-xl border-2 border-zinc-200 px-4 py-3 text-zinc-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                    >
                      {VIBES.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-zinc-700">Length</span>
                    <select
                      value={state.length}
                      onChange={(e) => update({ length: e.target.value as Length })}
                      className="rounded-xl border-2 border-zinc-200 px-4 py-3 text-zinc-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                    >
                      {LENGTH_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="mb-6 text-xl font-bold text-zinc-800 sm:text-2xl">
                  What do they love? ✨
                </h2>
                <div className="space-y-5">
                  <p className="text-sm text-zinc-600">Pick any topics (optional)</p>
                  <div className="flex flex-wrap gap-2">
                    {INTEREST_TOPICS.map((topic) => {
                      const selected = state.selectedTopics.includes(topic);
                      return (
                        <label
                          key={topic}
                          className={`cursor-pointer select-none rounded-full border-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                            selected
                              ? "border-amber-500 bg-amber-500 text-white shadow-md shadow-amber-500/25"
                              : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-amber-200"
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
                  <div>
                    <span className="text-sm font-medium text-zinc-700">Other interests</span>
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={state.otherInput}
                        onChange={(e) => update({ otherInput: e.target.value })}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOther())}
                        className="flex-1 rounded-xl border-2 border-zinc-200 px-4 py-2.5 text-zinc-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                        placeholder="e.g. volcanoes"
                      />
                      <button
                        type="button"
                        onClick={addOther}
                        className="rounded-xl border-2 border-zinc-200 bg-zinc-50 px-4 py-2.5 font-medium text-zinc-700 transition-colors hover:border-amber-300 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                      >
                        Add
                      </button>
                    </div>
                    {state.otherInterests.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {state.otherInterests.map((item, index) => (
                          <span
                            key={`${item}-${index}`}
                            className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900"
                          >
                            {item}
                            <button
                              type="button"
                              onClick={() => removeOther(index)}
                              className="rounded-full p-0.5 hover:bg-amber-200/50 focus:outline-none focus:ring-2 focus:ring-amber-400"
                              aria-label={`Remove ${item}`}
                            >
                              <span aria-hidden>×</span>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h2 className="mb-6 text-xl font-bold text-zinc-800 sm:text-2xl">
                  Character details 🧒
                </h2>
                <div className="space-y-4">
                  {[
                    { label: "Gender expression", value: state.genderExpression, key: "genderExpression", options: GENDER_EXPRESSIONS },
                    { label: "Skin tone", value: state.skinTone, key: "skinTone", options: SKIN_TONES },
                    { label: "Hair color", value: state.hairColor, key: "hairColor", options: HAIR_COLORS },
                    { label: "Hair type", value: state.hairType, key: "hairType", options: HAIR_TYPES },
                    { label: "Hair length", value: state.hairLength, key: "hairLength", options: HAIR_LENGTHS },
                  ].map(({ label, value, key, options }) => (
                    <label key={key} className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-zinc-700">{label}</span>
                      <select
                        value={value}
                        onChange={(e) => update({ [key]: e.target.value } as Partial<WizardFormState>)}
                        className="rounded-xl border-2 border-zinc-200 px-4 py-3 text-zinc-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                      >
                        {options.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-zinc-700">Signature detail (optional)</span>
                    <input
                      type="text"
                      value={state.signatureDetail}
                      onChange={(e) => update({ signatureDetail: e.target.value })}
                      className="rounded-xl border-2 border-zinc-200 px-4 py-3 text-zinc-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                      placeholder="e.g. round glasses, freckles"
                    />
                  </label>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <h2 className="mb-6 text-xl font-bold text-zinc-800 sm:text-2xl">
                  Ready to create! 🌙
                </h2>
                <div className="space-y-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2 rounded-xl bg-zinc-50 p-4">
                    <span className="font-medium text-zinc-500">Basics</span>
                    <span className="text-zinc-800">{state.childName || "—"}</span>
                    <span className="text-zinc-500">·</span>
                    <span className="text-zinc-800">{state.age ? `${state.age} yrs` : "Age not set"}</span>
                    <button
                      type="button"
                      onClick={() => goToStep(0)}
                      className="ml-auto rounded-lg px-3 py-1.5 font-medium text-amber-600 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 rounded-xl bg-zinc-50 p-4">
                    <span className="font-medium text-zinc-500">Story</span>
                    <span className="text-zinc-800">{state.vibe}</span>
                    <span className="text-zinc-500">·</span>
                    <span className="text-zinc-800">{state.length}</span>
                    <button
                      type="button"
                      onClick={() => goToStep(1)}
                      className="ml-auto rounded-lg px-3 py-1.5 font-medium text-amber-600 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 rounded-xl bg-zinc-50 p-4">
                    <span className="font-medium text-zinc-500">Interests</span>
                    {buildInterestsArray(state.selectedTopics, state.otherInterests).length > 0 ? (
                      <span className="text-zinc-800">
                        {buildInterestsArray(state.selectedTopics, state.otherInterests).join(", ")}
                      </span>
                    ) : (
                      <span className="text-zinc-400">None selected</span>
                    )}
                    <button
                      type="button"
                      onClick={() => goToStep(2)}
                      className="ml-auto rounded-lg px-3 py-1.5 font-medium text-amber-600 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 rounded-xl bg-zinc-50 p-4">
                    <span className="font-medium text-zinc-500">Character</span>
                    <span className="text-zinc-800">
                      {state.genderExpression}, {state.skinTone}, {state.hairColor} {state.hairType} {state.hairLength}
                      {state.signatureDetail.trim() ? ` · ${state.signatureDetail}` : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => goToStep(3)}
                      className="ml-auto rounded-lg px-3 py-1.5 font-medium text-amber-600 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                    >
                      Edit
                    </button>
                  </div>
                </div>
                <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-zinc-600">
                  <input
                    type="checkbox"
                    checked={state.longTextMode}
                    onChange={(e) => update({ longTextMode: e.target.checked })}
                    className="h-4 w-4 rounded border-zinc-300 text-amber-500 focus:ring-amber-400"
                  />
                  Long Text Mode (Pagination Test)
                </label>
              </>
            )}
          </div>

          <div className="sticky bottom-0 flex gap-3 border-t border-zinc-100 bg-white/95 p-4 sm:p-6">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => goToStep(step - 1)}
                className="min-h-[48px] flex-1 rounded-xl border-2 border-zinc-200 bg-white px-4 font-semibold text-zinc-700 transition-colors hover:border-amber-200 hover:bg-amber-50/50 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
              >
                Back
              </button>
            ) : (
              <div className="min-h-[48px] flex-1" />
            )}
            {step < TOTAL_STEPS - 1 ? (
              <button
                type="button"
                onClick={() => goToStep(step + 1)}
                disabled={!canProceed(step, state)}
                className="min-h-[48px] flex-1 rounded-xl bg-amber-500 px-4 font-semibold text-white shadow-md shadow-amber-500/25 transition-all hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="min-h-[48px] flex-1 rounded-xl bg-amber-500 px-4 font-semibold text-white shadow-md shadow-amber-500/25 transition-all hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {isLoading ? "Creating…" : "Generate Story"}
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Let&apos;s make a bedtime book ✨
        </p>
      </div>
    </div>
  );
}
