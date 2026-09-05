import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function isCronAuthorized(request: Request) {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return safeEqual(supplied, env().CRON_SECRET);
}

export function isTelegramAuthorized(request: Request) {
  const expected = env().TELEGRAM_WEBHOOK_SECRET;
  if (!expected) return true;
  return safeEqual(request.headers.get("x-telegram-bot-api-secret-token") ?? "", expected);
}
