"use client";

import { useCallback, useEffect, useState } from "react";
import { SEED_ITEMS } from "@/lib/seed";
import type { StoredFeedItem } from "@/types/feed";

const STORAGE_KEY = "remembr-feed-items";

function loadItems(): StoredFeedItem[] {
  if (typeof window === "undefined") return SEED_ITEMS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_ITEMS));
      return SEED_ITEMS;
    }
    return JSON.parse(raw) as StoredFeedItem[];
  } catch {
    return SEED_ITEMS;
  }
}

function saveItems(items: StoredFeedItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useFeedItems() {
  const [items, setItems] = useState<StoredFeedItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(loadItems());
    setHydrated(true);
  }, []);

  const persist = useCallback((updater: (prev: StoredFeedItem[]) => StoredFeedItem[]) => {
    setItems((prev) => {
      const next = updater(prev);
      saveItems(next);
      return next;
    });
  }, []);

  const addItems = useCallback(
    (newItems: StoredFeedItem[]) => {
      persist((prev) => [...newItems, ...prev]);
    },
    [persist]
  );

  const updateItem = useCallback(
    (id: string, updates: Partial<StoredFeedItem>) => {
      persist((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
      );
    },
    [persist]
  );

  const markDone = useCallback(
    (id: string) => updateItem(id, { status: "done" }),
    [updateItem]
  );

  const dismiss = useCallback(
    (id: string) => updateItem(id, { status: "dismissed" }),
    [updateItem]
  );

  const resetToSeed = useCallback(() => {
    saveItems(SEED_ITEMS);
    setItems(SEED_ITEMS);
  }, []);

  return {
    items,
    hydrated,
    addItems,
    updateItem,
    markDone,
    dismiss,
    resetToSeed,
  };
}
