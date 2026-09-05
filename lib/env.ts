import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_GROUP_ID: z.string().regex(/^-?\d+$/),
  CRON_SECRET: z.string().min(16),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(1).optional(),
});

export function env() {
  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(`Invalid server environment: ${result.error.issues.map((i) => i.path.join(".")).join(", ")}`);
  }
  return result.data;
}
