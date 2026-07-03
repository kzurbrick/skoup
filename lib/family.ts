import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

const INBOUND_DOMAIN = "mailin.skoup.app";

export type FamilyContext = {
  familyId: string;
  mailboxHash: string;
  inboundEmail: string;
};

function randomMailboxHash(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "family-";
  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

async function pickMailboxHash(admin: SupabaseClient): Promise<string> {
  const { data: testTaken } = await admin
    .from("inbound_addresses")
    .select("id")
    .eq("mailbox_hash", "test")
    .maybeSingle();

  if (!testTaken) return "test";
  return randomMailboxHash();
}

export async function getOrCreateFamily(
  supabase: SupabaseClient,
  userId: string
): Promise<FamilyContext> {
  const { data: existingFamily, error: familyError } = await supabase
    .from("families")
    .select("id")
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (familyError) throw familyError;

  if (existingFamily) {
    const { data: address, error: addressError } = await supabase
      .from("inbound_addresses")
      .select("mailbox_hash")
      .eq("family_id", existingFamily.id)
      .single();

    if (addressError) throw addressError;

    return {
      familyId: existingFamily.id,
      mailboxHash: address.mailbox_hash,
      inboundEmail: `${address.mailbox_hash}@${INBOUND_DOMAIN}`,
    };
  }

  const admin = createAdminClient();
  const mailboxHash = await pickMailboxHash(admin);

  const { data: family, error: createFamilyError } = await admin
    .from("families")
    .insert({ owner_user_id: userId })
    .select("id")
    .single();

  if (createFamilyError) throw createFamilyError;

  const { error: createAddressError } = await admin.from("inbound_addresses").insert({
    family_id: family.id,
    mailbox_hash: mailboxHash,
    domain: INBOUND_DOMAIN,
  });

  if (createAddressError) throw createAddressError;

  return {
    familyId: family.id,
    mailboxHash,
    inboundEmail: `${mailboxHash}@${INBOUND_DOMAIN}`,
  };
}

export async function getFamilyByMailboxHash(
  mailboxHash: string
): Promise<{ familyId: string } | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("inbound_addresses")
    .select("family_id")
    .eq("mailbox_hash", mailboxHash)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return { familyId: data.family_id };
}
