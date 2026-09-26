import { getSupabaseAdmin } from "@/lib/supabase";
import type { Member, Membership } from "@/lib/types";

export async function findByTelegramUserId(userId: number) {
  const { data, error } = await getSupabaseAdmin()
    .from("memberships")
    .select("*")
    .eq("telegram_user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as Membership | null;
}

export async function findByMemberEmail(email: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("memberships")
    .select("*, members!inner(email)")
    .eq("members.email", email.trim().toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data as (Membership & { members: Pick<Member, "email"> }) | null;
}

// Status kolom baru berubah permanen saat cron jalan, jadi baris yang
// expired_at-nya sudah lewat tapi belum tersentuh cron tetap harus dibaca
// sebagai EXPIRED oleh pemanggil.
export function effectiveStatus(membership: Membership) {
  return membership.status === "ACTIVE" && new Date(membership.expired_at).getTime() > Date.now()
    ? "ACTIVE"
    : "EXPIRED";
}
