import { getSupabaseAdmin } from "@/lib/supabase";
import { normalizeIndonesianPhone } from "@/lib/phone";
import type { Membership } from "@/lib/types";

export async function findByPhone(phone: string) {
  const normalized = normalizeIndonesianPhone(phone);
  const { data, error } = await getSupabaseAdmin().from("memberships").select("*").eq("telegram_phone", normalized).maybeSingle();
  if (error) throw error;
  return data as Membership | null;
}

export async function findByTelegramUserId(userId: number) {
  const { data, error } = await getSupabaseAdmin().from("memberships").select("*").eq("telegram_user_id", userId).maybeSingle();
  if (error) throw error;
  return data as Membership | null;
}

export function effectiveStatus(membership: Membership) {
  return membership.status === "ACTIVE" && new Date(membership.expired_at).getTime() > Date.now() ? "ACTIVE" : "EXPIRED";
}

export async function bindTelegramUser(membershipId: string, userId: number) {
  const { error } = await getSupabaseAdmin().from("memberships").update({ telegram_user_id: userId }).eq("id", membershipId);
  if (error) throw error;
}
