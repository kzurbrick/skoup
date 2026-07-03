"use client";

import { useEffect, useState } from "react";
import AddEmailModal from "@/components/skoup/AddEmailModal";
import FeedCard from "@/components/skoup/FeedCard";
import ItemDetailModal from "@/components/skoup/ItemDetailModal";
import SourceEmailView from "@/components/skoup/SourceEmailView";
import { useFeedItems } from "@/hooks/useFeedItems";
import { createClient } from "@/lib/supabase/client";
import { countAttentionItems, groupFeedItems } from "@/lib/feed";
import type { EmailMetadata, StoredFeedItem } from "@/types/feed";

export default function FeedPage() {
  const { items, hydrated, error, addItems, updateItem, markDone, dismiss } =
    useFeedItems();
  const [showAddEmail, setShowAddEmail] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StoredFeedItem | null>(null);
  const [sourceEmail, setSourceEmail] = useState<StoredFeedItem["emailSource"] | null>(null);
  const [justAdded, setJustAdded] = useState<number | null>(null);
  const [inboundEmail, setInboundEmail] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.inboundEmail) setInboundEmail(data.inboundEmail);
        if (data.email) setUserEmail(data.email);
      })
      .catch(() => {});
  }, []);

  const attentionCount = countAttentionItems(items);
  const groups = groupFeedItems(items);

  const handleExtracted = async (
    newItems: StoredFeedItem[],
    _emailSource: { body: string; metadata: EmailMetadata }
  ) => {
    setSaveError(null);
    try {
      const saved = await addItems(newItems);
      setJustAdded(saved.length);
      setTimeout(() => setJustAdded(null), 4000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save items");
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const copyInboundEmail = async () => {
    if (!inboundEmail) return;
    await navigator.clipboard.writeText(inboundEmail);
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf8ff]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8ff]">
      <header className="sticky top-0 z-30 border-b border-violet-100/60 bg-[#faf8ff]/90 backdrop-blur-md">
        <div className="mx-auto max-w-lg px-4 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Skoup
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">
                Your family&apos;s school scoop.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="shrink-0 text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Sign out
            </button>
          </div>

          {userEmail && (
            <p className="mt-2 text-xs text-slate-400">Signed in as {userEmail}</p>
          )}

          {inboundEmail && (
            <div className="mt-3 rounded-xl bg-violet-50 px-3 py-2.5">
              <p className="text-xs font-medium text-violet-800">Forward emails to</p>
              <button
                type="button"
                onClick={copyInboundEmail}
                className="mt-0.5 break-all text-left text-sm font-semibold text-violet-700 hover:text-violet-900"
              >
                {inboundEmail}
              </button>
            </div>
          )}

          <p className="mt-2 text-sm font-medium text-violet-700">
            {attentionCount === 0
              ? "You're all caught up!"
              : `Today, ${attentionCount} item${attentionCount === 1 ? "" : "s"} need your attention.`}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-28 pt-4">
        {(error || saveError) && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error ?? saveError}
          </div>
        )}

        {justAdded !== null && (
          <div className="mb-4 rounded-xl bg-violet-100 px-4 py-3 text-sm font-medium text-violet-800">
            Added {justAdded} item{justAdded === 1 ? "" : "s"} to your feed
          </div>
        )}

        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-violet-200 bg-white px-6 py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-violet-100">
              <InboxIcon />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">
              Your feed is clear
            </h2>
            <p className="mt-1 max-w-xs text-sm text-slate-500">
              Paste a school email or forward one to your Skoup address to get
              started.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(({ group, items: groupItems }) => (
              <section key={group}>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {group}
                </h2>
                <div className="space-y-3">
                  {groupItems.map((item) => (
                    <FeedCard
                      key={item.id}
                      item={item}
                      onView={setSelectedItem}
                      onMarkDone={markDone}
                      onDismiss={dismiss}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-violet-100/60 bg-[#faf8ff]/95 px-4 py-4 backdrop-blur-md">
        <div className="mx-auto max-w-lg">
          <button
            type="button"
            onClick={() => setShowAddEmail(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 py-4 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition-all hover:bg-violet-700 active:scale-[0.98]"
          >
            <PlusIcon />
            Add Email
          </button>
        </div>
      </div>

      {showAddEmail && (
        <AddEmailModal
          onClose={() => setShowAddEmail(false)}
          onExtracted={handleExtracted}
        />
      )}

      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onSave={updateItem}
          onMarkDone={markDone}
          onDismiss={dismiss}
          onViewSource={() => {
            if (selectedItem.emailSource) {
              setSourceEmail(selectedItem.emailSource);
            }
          }}
        />
      )}

      {sourceEmail && (
        <SourceEmailView
          source={sourceEmail}
          onClose={() => setSourceEmail(null)}
        />
      )}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg className="h-7 w-7 text-violet-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}
