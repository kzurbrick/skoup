"use client";

import React, { forwardRef, useEffect, useState } from "react";
import HTMLFlipBook from "react-pageflip";

const MOBILE_BREAKPOINT = 768;

/** Single-page size; in landscape two pages sit side-by-side (total width = 2 × PAGE_WIDTH) */
const PAGE_WIDTH = 350;
const PAGE_HEIGHT = 450;

export type Book = {
  title: string;
  pages: { text: string }[];
};

const Page = forwardRef<HTMLDivElement, { text: string; isFirst: boolean }>(
  function Page({ text, isFirst }, ref) {
    return (
      <div
        ref={ref}
        className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg"
        style={{ padding: 0 }}
      >
        <div className="flex flex-1 flex-col justify-center p-6">
          {isFirst ? (
            <p className="text-center text-lg font-medium leading-relaxed text-zinc-800">
              {text}
            </p>
          ) : (
            <p className="text-sm leading-[1.6] text-zinc-700">{text}</p>
          )}
        </div>
      </div>
    );
  }
);

/** Same value on server and first client render to avoid hydration mismatch. */
const INITIAL_DIMENSIONS = { width: 720, height: 450 };

function getBookDimensions(): { width: number; height: number } {
  if (typeof window === "undefined") return INITIAL_DIMENSIONS;
  return window.innerWidth < MOBILE_BREAKPOINT
    ? { width: 320, height: 480 }
    : { width: 720, height: 450 };
}

const DEFAULT_BOOK: Book = {
  title: "Bedtime Book",
  pages: [
    { text: "Create a story at /create to read your book here." },
  ],
};

type BookReaderProps = {
  book?: Book;
};

export default function BookReader({ book: bookProp }: BookReaderProps) {
  const book = bookProp ?? DEFAULT_BOOK;
  const [dimensions, setDimensions] = useState(INITIAL_DIMENSIONS);
  // Base on viewport so desktop (>=768px) gets two-page spread. Default true for consistent first paint.
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const update = () => {
      setDimensions(getBookDimensions());
      setIsDesktop(window.innerWidth >= MOBILE_BREAKPOINT);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Force the library to re-measure after layout (it uses getDistElement().offsetWidth)
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
    return () => cancelAnimationFrame(id);
  }, [dimensions.width, dimensions.height]);

  const usePortrait = !isDesktop;
  const bookSize = isDesktop ? "fixed" : "stretch";

  if (!book.pages.length) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 py-8">
        <p className="text-zinc-600">No pages to display.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-800">{book.title}</h1>
      <div
        className="[&_.stf__item]:!overflow-visible"
        style={{
          width: dimensions.width,
          height: dimensions.height,
        }}
      >
        <HTMLFlipBook
          key={`${dimensions.width}-${dimensions.height}`}
          className="h-full w-full"
          style={{ width: "100%", height: "100%" }}
          width={PAGE_WIDTH}
          height={PAGE_HEIGHT}
          size={bookSize}
          minWidth={280}
          maxWidth={400}
          minHeight={380}
          maxHeight={500}
          drawShadow
          flippingTime={600}
          usePortrait={usePortrait}
          showCover={false}
          mobileScrollSupport
          maxShadowOpacity={1}
        >
          {book.pages.map((page, index) => (
            <Page
              key={index}
              text={page.text}
              isFirst={index === 0}
            />
          ))}
        </HTMLFlipBook>
      </div>
    </div>
  );
}
