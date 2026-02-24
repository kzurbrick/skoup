"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BookReader, { type Book } from "@/components/BookReader";

const STORAGE_KEY = "bedtime-book:generated";

function getStoredBook(): Book | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object" || !("title" in data) || !("pages" in data))
      return null;
    const { title, pages } = data as { title: unknown; pages: unknown };
    if (typeof title !== "string" || !Array.isArray(pages)) return null;
    const validPages = pages.filter(
      (p): p is { text: string } =>
        p != null && typeof p === "object" && "text" in p && typeof (p as { text: unknown }).text === "string"
    );
    return { title, pages: validPages };
  } catch {
    return null;
  }
}

export default function ReadPage() {
  const router = useRouter();
  const [book, setBook] = useState<Book | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const stored = getStoredBook();
    setBook(stored);
    setChecked(true);
  }, []);

  useEffect(() => {
    if (!checked) return;
    if (!book || book.pages.length === 0) {
      router.replace("/create");
    }
  }, [book, checked, router]);

  if (!checked || !book || book.pages.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-zinc-600">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
      <BookReader book={book} />
    </div>
  );
}
