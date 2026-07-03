import { NextRequest, NextResponse } from "next/server";
import { getOrCreateFamily } from "@/lib/family";
import { partialFeedItemToRow, rowToStoredFeedItem } from "@/lib/feedDb";
import { createClient } from "@/lib/supabase/server";
import type { StoredFeedItem } from "@/types/feed";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Partial<StoredFeedItem>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { familyId } = await getOrCreateFamily(supabase, user.id);
  const updates = {
    ...partialFeedItemToRow(body),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("feed_items")
    .update(updates)
    .eq("id", id)
    .eq("family_id", familyId)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[feed-items PATCH]", error);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ item: rowToStoredFeedItem(data) });
}
