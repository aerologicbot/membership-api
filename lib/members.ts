import { randomBytes } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase";
import { DEFAULT_PACKAGE, PACKAGES, type PackageCode } from "@/lib/catalog";
import { env } from "@/lib/env";
import type { Member, Membership, RegistrationInput } from "@/lib/types";

// Postgres unique_violation. Dipakai untuk membedakan "email sudah terdaftar"
// (pesan yang bisa ditindaklanjuti user) dari error database lain.
const UNIQUE_VIOLATION = "23505";

export class DuplicateEmailError extends Error {
  constructor() {
    super("Email ini sudah terdaftar.");
    this.name = "DuplicateEmailError";
  }
}

export async function createMember(input: RegistrationInput): Promise<Member> {
  const { data, error } = await getSupabaseAdmin().from("members").insert(input).select("*").single();
  if (error?.code === UNIQUE_VIOLATION) throw new DuplicateEmailError();
  if (error) throw error;
  return data as Member;
}

export async function findMemberByEmail(email: string): Promise<Member | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("members")
    .select("*")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return (data as Member | null) ?? null;
}

// 32 karakter base64url: aman sebagai payload deep-link Telegram (batas 64
// karakter, hanya A-Z a-z 0-9 _ -) dan cukup panjang untuk tidak bisa ditebak.
function newStartToken() {
  return randomBytes(24).toString("base64url");
}

export function startLink(token: string) {
  return `https://t.me/${env().TELEGRAM_BOT_USERNAME}?start=${token}`;
}

/**
 * Dipanggil setelah pembayaran berhasil. Membuat membership kalau belum ada,
 * atau memperpanjang yang sudah ada lewat renew_membership() — jadi aman
 * dipanggil dua kali oleh webhook pembayaran yang mengirim ulang notifikasi.
 */
export async function activateMembership(memberId: string, packageCode: PackageCode = DEFAULT_PACKAGE) {
  const supabase = getSupabaseAdmin();
  const { durationDays } = PACKAGES[packageCode];
  const hours = durationDays * 24;

  const { data: existing, error: findError } = await supabase
    .from("memberships")
    .select("*")
    .eq("member_id", memberId)
    .maybeSingle();
  if (findError) throw findError;

  if (existing) {
    const membership = existing as Membership;
    const { data, error } = await supabase.rpc("renew_membership", {
      p_membership_id: membership.id,
      p_hours: hours,
    });
    if (error) throw error;

    // Token lama yang belum dipakai tetap berlaku; yang sudah dipakai diganti
    // supaya user bisa masuk grup lagi setelah perpanjangan.
    if (membership.start_token && !membership.start_token_used_at) {
      return { membership: data as Membership, token: membership.start_token };
    }
    const token = newStartToken();
    const { error: tokenError } = await supabase
      .from("memberships")
      .update({ start_token: token, start_token_used_at: null })
      .eq("id", membership.id);
    if (tokenError) throw tokenError;
    return { membership: data as Membership, token };
  }

  const token = newStartToken();
  const now = new Date();
  const { data, error } = await supabase
    .from("memberships")
    .insert({
      member_id: memberId,
      package: packageCode,
      status: "ACTIVE",
      started_at: now.toISOString(),
      expired_at: new Date(now.getTime() + durationDays * 86_400_000).toISOString(),
      start_token: token,
    })
    .select("*")
    .single();
  if (error) throw error;
  return { membership: data as Membership, token };
}

export async function findByStartToken(token: string): Promise<Membership | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("memberships")
    .select("*")
    .eq("start_token", token)
    .maybeSingle();
  if (error) throw error;
  return (data as Membership | null) ?? null;
}

export async function claimStartToken(membershipId: string, telegramUserId: number) {
  const { error } = await getSupabaseAdmin()
    .from("memberships")
    .update({ telegram_user_id: telegramUserId, start_token_used_at: new Date().toISOString() })
    .eq("id", membershipId);
  if (error) throw error;
}
