"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BookReader from "@/components/BookReader";
import type { Book, BookPage } from "@/types/book";

const STORAGE_KEY = "bedtime-book:generated";

function getStoredBook(): Book | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object" || !("title" in data) || !("pages" in data))
      return null;
    const { title, pages, ...rest } = data as {
      title: unknown;
      pages: unknown;
      [key: string]: unknown;
    };
    if (typeof title !== "string" || !Array.isArray(pages)) return null;
    const validPages = pages.filter(
      (p): p is BookPage =>
        p != null && typeof p === "object" && "text" in p && typeof (p as { text: unknown }).text === "string"
    );
    const book: Book = {
      ...(rest as Partial<Book>),
      title,
      pages: validPages,
    };
    return book;
  } catch {
    return null;
  }
}

export default function ReadPage() {
  const router = useRouter();
  const [book, setBook] = useState<Book | null>(null);
  const [checked, setChecked] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  /** DEBUG: error details from "Generate Images Now (debug)" button. Remove with debug button. */
  const [debugImageError, setDebugImageError] = useState<string | null>(null);
  /** Ensures auto image generation runs only once per book load. */
  const autoImageGenTriggeredRef = useRef(false);

  useEffect(() => {
    const stored = getStoredBook();
    if (stored) {
      console.log("READ: stored book keys", Object.keys(stored));
    }
    setBook(stored);
    setChecked(true);
  }, []);

  useEffect(() => {
    if (!checked) return;
    if (!book || book.pages.length === 0) {
      router.replace("/create");
    }
  }, [book, checked, router]);

  // Auto-trigger /api/generate-images when prompts exist and images are missing (once per load).
  useEffect(() => {
    if (!checked || !book || book.pages.length === 0) return;

    const promptsExist =
      !!book.coverImagePrompt && book.pages.some((p) => !!p.imagePrompt);
    const imagesMissing =
      !book.coverImageBase64 || book.pages.some((p) => !p.imageBase64);

    if (!promptsExist || !imagesMissing) return;
    if (autoImageGenTriggeredRef.current) return;

    autoImageGenTriggeredRef.current = true;
    setIsGeneratingImages(true);
    setImageError(null);

    const generateImages = async (currentBook: Book) => {
      try {
        console.log("AUTO: starting /api/generate-images");
        const res = await fetch("/api/generate-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            coverImagePrompt: currentBook.coverImagePrompt,
            sceneImagePrompts: currentBook.pages.map((p) => p.imagePrompt ?? ""),
            ...(currentBook.characterVisualCapsule && {
              characterVisualCapsule: currentBook.characterVisualCapsule,
            }),
          }),
        });
        console.log("AUTO: /api/generate-images status", res.status);

        if (!res.ok) {
          throw new Error("Image API request failed");
        }
        const data = (await res.json()) as unknown;
        if (!data || typeof data !== "object") {
          throw new Error("Invalid image response");
        }
        const { coverImageBase64, sceneImageBase64 } = data as {
          coverImageBase64?: unknown;
          sceneImageBase64?: unknown;
        };
        if (typeof coverImageBase64 !== "string" || !Array.isArray(sceneImageBase64)) {
          throw new Error("Missing image data");
        }
        if (sceneImageBase64.length !== currentBook.pages.length) {
          throw new Error("Image count mismatch");
        }
        console.log("AUTO: images received");

        const updatedBook: Book = {
          ...currentBook,
          coverImageBase64,
          pages: currentBook.pages.map((page, index) => ({
            ...page,
            imageBase64:
              typeof sceneImageBase64[index] === "string"
                ? (sceneImageBase64[index] as string)
                : page.imageBase64,
          })),
        };
        setBook(updatedBook);
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBook));
        } catch {
          // ignore storage errors
        }
        setImageError(null);
      } catch (err) {
        console.error("AUTO: image generation failed", err);
        setImageError("We couldn't generate the illustrations. You can try again.");
      } finally {
        setIsGeneratingImages(false);
      }
    };

    void generateImages(book);
  }, [book, checked]);

  const handleRetryImages = () => {
    if (!book || isGeneratingImages) return;
    setIsGeneratingImages(true);
    setImageError(null);
    void (async () => {
      try {
        const res = await fetch("/api/generate-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            coverImagePrompt: book.coverImagePrompt,
            sceneImagePrompts: book.pages.map((p) => p.imagePrompt as string),
            ...(book.characterVisualCapsule && {
              characterVisualCapsule: book.characterVisualCapsule,
            }),
          }),
        });
        if (!res.ok) {
          throw new Error("Image API request failed");
        }
        const data = (await res.json()) as unknown;
        if (!data || typeof data !== "object") {
          throw new Error("Invalid image response");
        }
        const { coverImageBase64, sceneImageBase64 } = data as {
          coverImageBase64?: unknown;
          sceneImageBase64?: unknown;
        };
        if (typeof coverImageBase64 !== "string" || !Array.isArray(sceneImageBase64)) {
          throw new Error("Missing image data");
        }
        if (sceneImageBase64.length !== book.pages.length) {
          throw new Error("Image count mismatch");
        }
        const updatedBook: Book = {
          ...book,
          coverImageBase64,
          pages: book.pages.map((page, index) => ({
            ...page,
            imageBase64:
              typeof sceneImageBase64[index] === "string"
                ? (sceneImageBase64[index] as string)
                : page.imageBase64,
          })),
        };
        setBook(updatedBook);
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBook));
        } catch {
          // ignore storage errors
        }
        setImageError(null);
      } catch {
        setImageError("We couldn't generate the illustrations. Please try again.");
      } finally {
        setIsGeneratingImages(false);
      }
    })();
  };

  /** DEBUG: Remove this handler and the debug button below when no longer needed. */
  const handleDebugGenerateImages = async () => {
    if (!book) return;
    console.log("READ: clicking debug generate");
    setDebugImageError(null);
    setIsGeneratingImages(true);
    try {
      const body = {
        coverImagePrompt: book.coverImagePrompt ?? "",
        sceneImagePrompts: book.pages.map((p) => p.imagePrompt ?? ""),
        ...(book.characterVisualCapsule && {
          characterVisualCapsule: book.characterVisualCapsule,
        }),
      };
      const res = await fetch("/api/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const rawText = await res.text();
      const responsePreview = rawText.slice(0, 200);
      console.log("READ: /api/generate-images status", res.status, "response (first 200 chars)", responsePreview);

      if (res.status !== 200) {
        let details = rawText;
        try {
          const parsed = JSON.parse(rawText) as { error?: string; details?: string };
          details = [parsed.error, parsed.details].filter(Boolean).join(" — ") || rawText;
        } catch {
          // use rawText as-is
        }
        setDebugImageError(`Status ${res.status}: ${details}`);
        return;
      }

      const data = JSON.parse(rawText) as unknown;
      if (!data || typeof data !== "object") {
        setDebugImageError("Invalid response: not an object");
        return;
      }
      const { coverImageBase64, sceneImageBase64 } = data as {
        coverImageBase64?: unknown;
        sceneImageBase64?: unknown;
      };
      if (typeof coverImageBase64 !== "string" || !Array.isArray(sceneImageBase64)) {
        setDebugImageError("Invalid response: missing coverImageBase64 or sceneImageBase64");
        return;
      }
      if (sceneImageBase64.length !== book.pages.length) {
        setDebugImageError(`Image count mismatch: got ${sceneImageBase64.length}, expected ${book.pages.length}`);
        return;
      }

      const updatedBook: Book = {
        ...book,
        coverImageBase64,
        pages: book.pages.map((page, index) => ({
          ...page,
          imageBase64:
            typeof sceneImageBase64[index] === "string"
              ? (sceneImageBase64[index] as string)
              : page.imageBase64,
        })),
      };
      setBook(updatedBook);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBook));
      setImageError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setDebugImageError(message);
      console.error("READ: debug generate failed", err);
    } finally {
      setIsGeneratingImages(false);
    }
  };

  if (!checked || !book || book.pages.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-zinc-600">Loading…</p>
      </div>
    );
  }

  const hasAllImages =
    !!book.coverImageBase64 && book.pages.length > 0 && book.pages.every((p) => !!p.imageBase64);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
      <div className="flex flex-col items-center gap-2 py-3 text-sm text-zinc-600">
        {isGeneratingImages && !hasAllImages && (
          <p className="rounded-full bg-amber-50 px-4 py-1.5 text-amber-800 shadow-sm">
            Generating illustrations…
          </p>
        )}
        {imageError && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="text-zinc-600">{imageError}</span>
            <button
              type="button"
              onClick={handleRetryImages}
              className="rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1"
            >
              Try again
            </button>
          </div>
        )}
        {/* DEBUG: remove block below when no longer needed */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleDebugGenerateImages}
            disabled={isGeneratingImages}
            className="rounded border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
          >
            Generate Images Now (debug)
          </button>
          {debugImageError && (
            <pre className="max-w-lg overflow-auto rounded bg-red-50 p-2 text-left text-xs text-red-800">
              {debugImageError}
            </pre>
          )}
        </div>
      </div>
      <BookReader book={book} />
    </div>
  );
}
