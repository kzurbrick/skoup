import { NextResponse } from "next/server";
import { getOrCreateFamily } from "@/lib/family";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const family = await getOrCreateFamily(supabase, user.id);

  return NextResponse.json({
    email: user.email,
    inboundEmail: family.inboundEmail,
    mailboxHash: family.mailboxHash,
  });
}
