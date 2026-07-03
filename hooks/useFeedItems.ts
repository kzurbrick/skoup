"use client";

import { useCallback, useEffect, useState } from "react";
import type { StoredFeedItem } from "@/types/feed";

export function useFeedItems() {
  const [items, setItems] = useState<StoredFeedItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/feed-items");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load feed");
      }

      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feed");
      setItems([]);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const addItems = useCallback(async (newItems: StoredFeedItem[]) => {
    const res = await fetch("/api/feed-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: newItems }),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error ?? "Failed to save items");
    }

    const saved = data.items as StoredFeedItem[];
    setItems((prev) => [...saved, ...prev]);
    return saved;
  }, []);

  const updateItem = useCallback(async (id: string, updates: Partial<StoredFeedItem>) => {
    const res = await fetch(`/api/feed-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error ?? "Failed to update item");
    }

    const updated = data.item as StoredFeedItem;
    setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
  }, []);

  const markDone = useCallback(
    (id: string) => updateItem(id, { status: "done" }),
    [updateItem]
  );

  const dismiss = useCallback(
    (id: string) => updateItem(id, { status: "dismissed" }),
    [updateItem]
  );

  return {
    items,
    hydrated,
    error,
    reload: loadItems,
    addItems,
    updateItem,
    markDone,
    dismiss,
  };
}
