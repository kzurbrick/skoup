"use client";

import React, { forwardRef, useEffect, useState } from "react";
import { Dancing_Script } from "next/font/google";
import HTMLFlipBook from "react-pageflip";
import type { Book, BookPage } from "@/types/book";

const dancingScript = Dancing_Script({ subsets: ["latin"], display: "swap" });

const MOBILE_BREAKPOINT = 768;

/** Single-page size; in landscape two pages sit side-by-side (total width = 2 × PAGE_WIDTH) */
const PAGE_WIDTH = 350;
const PAGE_HEIGHT = 450;

/** Content area inside a story page: same as StoryPage content (p-6). Used for measuring. */
const STORY_PADDING_PX = 24;
/** Footer "Page X of Y" height reserve so content doesn't overlap it. */
const FOOTER_HEIGHT_PX = 32;
/** Reserved height for illustration area on each story page. */
const IMAGE_HEIGHT_PX = 150;
/** Usable height for story text (no scrolling). Fixed so split is deterministic. */
const TEXT_HEIGHT_PX =
  PAGE_HEIGHT - STORY_PADDING_PX * 2 - FOOTER_HEIGHT_PX - IMAGE_HEIGHT_PX;
/** Usable width for story text. */
const CONTENT_WIDTH_PX = PAGE_WIDTH - STORY_PADDING_PX * 2;

/**
 * Scene-based pagination: the API returns "scene pages" (story beats).
 * We convert them into "rendered pages" (physical flipbook pages) by splitting
 * long scene text so it fits without scrolling or clipping.
 * Each rendered page keeps track of which scene it came from.
 */
type RenderedPage = { text: string; sceneIndex: number };

/** Splits text into paragraphs (double newline). */
function getParagraphs(text: string): string[] {
  return text
    .trim()
    .split(/\n\n+/)
    .map((p) => p.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

/** Splits a paragraph into sentences. */
function getSentences(paragraph: string): string[] {
  if (!paragraph.trim()) return [];
  return paragraph
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Splits long scene text into one or more rendered page texts.
 * Boundaries: paragraph first, then sentence, never mid-word (word boundary ok as last resort).
 */
function splitSceneIntoPages(
  sceneText: string,
  measure: (text: string) => number
): string[] {
  const pages: string[] = [];
  const paragraphs = getParagraphs(sceneText);
  if (paragraphs.length === 0) return [""];

  let currentChunks: string[] = [];

  const flushPage = () => {
    if (currentChunks.length > 0) {
      pages.push(currentChunks.join(" "));
      currentChunks = [];
    }
  };

  for (const para of paragraphs) {
    if (measure(para) <= TEXT_HEIGHT_PX) {
      const candidate = currentChunks.length ? [...currentChunks, para].join(" ") : para;
      if (measure(candidate) <= TEXT_HEIGHT_PX) {
        currentChunks.push(para);
      } else {
        flushPage();
        currentChunks = [para];
      }
      continue;
    }

    const sentences = getSentences(para);
    for (const sentence of sentences) {
      const candidate =
        currentChunks.length ? [...currentChunks, sentence].join(" ") : sentence;
      const h = measure(candidate);

      if (h <= TEXT_HEIGHT_PX) {
        currentChunks.push(sentence);
        continue;
      }

      flushPage();

      if (measure(sentence) <= TEXT_HEIGHT_PX) {
        currentChunks = [sentence];
        continue;
      }

      const words = sentence.split(/\s+/);
      let wordChunk: string[] = [];
      for (const word of words) {
        const candidateWord = wordChunk.length ? [...wordChunk, word].join(" ") : word;
        if (measure(candidateWord) <= CONTENT_HEIGHT_PX) {
          wordChunk.push(word);
        } else {
          if (wordChunk.length > 0) {
            pages.push(wordChunk.join(" "));
            wordChunk = [];
          }
          pages.push(word);
        }
      }
      if (wordChunk.length > 0) currentChunks = wordChunk;
    }
  }

  flushPage();
  return pages.length ? pages : [""];
}

/**
 * Converts API scene pages into rendered pages (physical flipbook pages).
 * Long scenes are split at paragraph/sentence/word boundaries so each rendered
 * page fits within TEXT_HEIGHT_PX without scrolling.
 */
function scenesToRenderedPages(
  scenes: BookPage[],
  measure: (text: string) => number
): RenderedPage[] {
  const rendered: RenderedPage[] = [];
  scenes.forEach((scene, sceneIndex) => {
    const pageTexts = splitSceneIntoPages(scene.text, measure);
    for (const text of pageTexts) {
      rendered.push({ text, sceneIndex });
    }
  });
  return rendered;
}

/** Dedicated cover page: title + optional illustration. Sole page with large/title typography. */
const Cover = forwardRef<HTMLDivElement, { title: string; coverImageBase64?: string | null }>(
  function Cover({ title, coverImageBase64 }, ref) {
    const hasImage = !!coverImageBase64;
    return (
      <div
        ref={ref}
        className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg"
        style={{ padding: 0 }}
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 py-10 text-center">
          <div className="mb-2 flex w-full justify-center">
            <div className="relative h-40 w-40 overflow-hidden rounded-2xl border border-amber-100 bg-amber-50">
              {hasImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`data:image/png;base64,${coverImageBase64}`}
                  alt={`${title} cover illustration`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full animate-pulse bg-gradient-to-br from-amber-50 via-amber-100 to-amber-50" />
              )}
            </div>
          </div>
          <h2 className="text-xl font-bold leading-tight text-zinc-800 md:text-2xl">
            {title}
          </h2>
          <p className="text-sm font-medium text-zinc-500">A Bedtime Story</p>
        </div>
      </div>
    );
  }
);

/**
 * Story page: one rendered page of content. Typography is uniform across all story pages.
 * Footer "Page X of Y" shows rendered page count only (cover and back cover not counted).
 */
const StoryPage = forwardRef<
  HTMLDivElement,
  {
    text: string;
    pageNum: number;
    totalRendered: number;
    imageBase64?: string | null;
  }
>(function StoryPage({ text, pageNum, totalRendered, imageBase64 }, ref) {
  return (
    <div
      ref={ref}
      className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg"
      style={{ padding: 0 }}
    >
      <div
        className="flex flex-col justify-start overflow-hidden p-6"
        style={{ height: PAGE_HEIGHT - FOOTER_HEIGHT_PX }}
      >
        <div
          className="mb-3 flex items-center justify-center"
          style={{ height: IMAGE_HEIGHT_PX }}
        >
          <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-amber-100 bg-amber-50">
            {imageBase64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:image/png;base64,${imageBase64}`}
                alt="Story illustration"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full animate-pulse bg-gradient-to-br from-amber-50 via-amber-100 to-amber-50" />
            )}
          </div>
        </div>
        <div
          className="overflow-hidden"
          style={{ height: TEXT_HEIGHT_PX + STORY_PADDING_PX * 2 - 12 }}
        >
          <p className="text-sm leading-[1.6] text-zinc-700">{text}</p>
        </div>
      </div>
      <div
        className="flex shrink-0 items-center justify-center border-t border-zinc-100 py-2 text-xs text-zinc-500"
        style={{ minHeight: FOOTER_HEIGHT_PX - 16 }}
      >
        Page {pageNum} of {totalRendered}
      </div>
    </div>
  );
});

/** Back cover: "The End" in script style. Matches front cover layout and styling. */
const BackCover = forwardRef<HTMLDivElement>(function BackCover(_, ref) {
  return (
    <div
      ref={ref}
      className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg"
      style={{ padding: 0 }}
    >
      <div
        className={`flex flex-1 flex-col items-center justify-center px-8 py-10 text-center ${dancingScript.className}`}
      >
        <p className="text-3xl font-normal tracking-wide text-zinc-600 md:text-4xl">
          The End
        </p>
      </div>
    </div>
  );
});

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
  const [isDesktop, setIsDesktop] = useState(true);
  /**
   * Rendered pages (UI): scene text split to fit fixed height. Empty until
   * we run the client-side measurement. Cover and back cover are not in this array.
   */
  const [renderPages, setRenderPages] = useState<RenderedPage[]>([]);

  useEffect(() => {
    const update = () => {
      setDimensions(getBookDimensions());
      setIsDesktop(window.innerWidth >= MOBILE_BREAKPOINT);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Scene → rendered pages: use a hidden measuring container with same font/width/line-height as story content
  useEffect(() => {
    if (!book.pages.length) {
      setRenderPages([]);
      return;
    }

    const el = document.createElement("div");
    Object.assign(el.style, {
      position: "absolute",
      left: "-9999px",
      top: "0",
      width: `${CONTENT_WIDTH_PX}px`,
      fontSize: "14px",
      lineHeight: "1.6",
      fontFamily: "inherit",
      boxSizing: "border-box",
      whiteSpace: "pre-wrap",
      wordWrap: "break-word",
    });
    document.body.appendChild(el);

    const measure = (text: string): number => {
      el.textContent = text;
      return el.offsetHeight;
    };

    const pages = scenesToRenderedPages(book.pages, measure);
    document.body.removeChild(el);
    setRenderPages(pages);
  }, [book.pages]);

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

  // Wait for client-side split so we don't render overflow/clipping
  if (renderPages.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 py-8">
        <p className="text-zinc-600">Preparing book…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 py-8">
      <div
        className="[&_.stf__item]:!overflow-visible"
        style={{
          width: dimensions.width,
          height: dimensions.height,
        }}
      >
        <HTMLFlipBook
          key={`${dimensions.width}-${dimensions.height}-${renderPages.length}`}
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
          showCover
          mobileScrollSupport
          maxShadowOpacity={1}
        >
          <Cover key="cover" title={book.title} coverImageBase64={book.coverImageBase64} />
          {renderPages.map((page, index) => {
            const prev = index > 0 ? renderPages[index - 1] : null;
            const isFirstForScene = !prev || prev.sceneIndex !== page.sceneIndex;
            const scene = book.pages[page.sceneIndex];
            const imageBase64 = isFirstForScene ? scene?.imageBase64 : undefined;
            return (
              <StoryPage
                key={index}
                text={page.text}
                pageNum={index + 1}
                totalRendered={renderPages.length}
                imageBase64={imageBase64}
              />
            );
          })}
          <BackCover key="back-cover" />
        </HTMLFlipBook>
      </div>
    </div>
  );
}
