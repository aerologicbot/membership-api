import { z } from "zod";
import { CAPITAL_RANGES, EXPERIENCE_LEVELS, GENDERS, REFERRAL_SOURCES, codesOf } from "./catalog.ts";
import { normalizeIndonesianPhone } from "./phone.ts";

export type MembershipStatus = "ACTIVE" | "EXPIRED";

export type Member = {
  id: string;
  full_name: string;
  email: string;
  whatsapp: string;
  telegram_username: string;
  gender: string;
  experience_level: string;
  capital_range: string;
  referral_source: string;
  created_at: string;
  updated_at: string;
};

export type Membership = {
  id: string;
  member_id: string | null;
  telegram_phone: string | null;
  telegram_user_id: number | null;
  package: string;
  status: MembershipStatus;
  started_at: string;
  expired_at: string;
  created_at: string;
  updated_at: string;
  kick_processed_at: string | null;
  kick_last_error: string | null;
  // Payload deep-link t.me/<bot>?start=<token>. Sekali pakai: start_token_used_at
  // terisi begitu user membukanya.
  start_token: string | null;
  start_token_used_at: string | null;
};

// Payload form pendaftaran, sekaligus satu-satunya tempat aturan validasi
// pendaftaran ditulis.
export const registrationSchema = z.object({
  full_name: z.string().trim().min(2, "Nama lengkap minimal 2 karakter").max(120),
  email: z.email("Format email tidak valid").trim().toLowerCase(),
  // Disimpan ternormalisasi (+62...) supaya satu orang tidak bisa mendaftar dua
  // kali dengan 0812... dan +62812... yang sebenarnya nomor yang sama.
  whatsapp: z
    .string()
    .trim()
    .min(8, "Nomor WhatsApp terlalu pendek")
    .transform((value, ctx) => {
      try {
        return normalizeIndonesianPhone(value);
      } catch {
        ctx.addIssue({ code: "custom", message: "Nomor WhatsApp tidak valid" });
        return z.NEVER;
      }
    })
    .refine((value) => /^[+][1-9][0-9]{7,14}$/.test(value), "Nomor WhatsApp tidak valid"),
  // Telegram: 5-32 karakter, diawali huruf, hanya huruf/angka/underscore. "@" di
  // depan dibuang supaya user boleh mengetik dengan atau tanpa itu.
  telegram_username: z
    .string()
    .trim()
    .transform((value) => value.replace(/^@+/, ""))
    .refine(
      (value) => /^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(value),
      "Username Telegram 5-32 karakter, diawali huruf, tanpa spasi",
    ),
  gender: z.enum(codesOf(GENDERS), { message: "Pilih jenis kelamin" }),
  experience_level: z.enum(codesOf(EXPERIENCE_LEVELS), { message: "Pilih pengalaman trading" }),
  capital_range: z.enum(codesOf(CAPITAL_RANGES), { message: "Pilih range modal" }),
  referral_source: z.enum(codesOf(REFERRAL_SOURCES), { message: "Pilih salah satu" }),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

export type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number; type: string };
    from?: { id: number; first_name?: string; username?: string };
    text?: string;
  };
  chat_member?: {
    chat: { id: number };
    from: { id: number };
    invite_link?: { invite_link: string };
    new_chat_member: { user: { id: number }; status: string };
  };
};
