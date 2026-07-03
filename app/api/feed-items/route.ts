import { NextRequest, NextResponse } from "next/server";
import { getOrCreateFamily } from "@/lib/family";
import { rowToStoredFeedItem, storedFeedItemToRow } from "@/lib/feedDb";
import { createClient } from "@/lib/supabase/server";
import type { StoredFeedItem } from "@/types/feed";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { familyId } = await getOrCreateFamily(supabase, user.id);

  const { data, error } = await supabase
    .from("feed_items")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[feed-items GET]", error);
    return NextResponse.json({ error: "Failed to load feed" }, { status: 500 });
  }

  return NextResponse.json({
    items: (data ?? []).map(rowToStoredFeedItem),
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { items?: StoredFeedItem[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const items = body.items;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items array is required" }, { status: 400 });
  }

  const { familyId } = await getOrCreateFamily(supabase, user.id);
  const rows = items.map((item) => storedFeedItemToRow(item, familyId));

  const { data, error } = await supabase.from("feed_items").insert(rows).select("*");

  if (error) {
    console.error("[feed-items POST]", error);
    return NextResponse.json({ error: "Failed to save items" }, { status: 500 });
  }

  return NextResponse.json({
    items: (data ?? []).map(rowToStoredFeedItem),
  });
}
