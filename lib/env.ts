import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_GROUP_ID: z.string().regex(/^-?\d+$/),
  CRON_SECRET: z.string().min(16),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(1).optional(),
  // Username bot tanpa "@" — dipakai membangun link t.me/<bot>?start=<token>
  // yang diberikan ke user setelah membayar.
  TELEGRAM_BOT_USERNAME: z
    .string()
    .min(1)
    .transform((value) => value.replace(/^@+/, "")),
  // Selama payment gateway belum terpasang, pendaftaran langsung mengaktifkan
  // membership supaya alurnya bisa diuji ujung ke ujung. Set "false" (atau
  // hapus) begitu Midtrans hidup — aktivasi lalu hanya datang dari webhook
  // pembayaran lewat POST /api/membership/activate.
  AUTO_ACTIVATE_ON_REGISTER: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export function env() {
  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(`Invalid server environment: ${result.error.issues.map((i) => i.path.join(".")).join(", ")}`);
  }
  return result.data;
}
