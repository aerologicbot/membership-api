import { env } from "@/lib/env";

type TelegramResponse<T> = { ok: boolean; result?: T; description?: string };

async function telegram<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${env().TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await response.json()) as TelegramResponse<T>;
  if (!response.ok || !data.ok || data.result === undefined) {
    throw new Error(`Telegram ${method} failed: ${data.description ?? response.statusText}`);
  }
  return data.result;
}

export function sendMessage(chatId: number, text: string, extra: Record<string, unknown> = {}) {
  return telegram("sendMessage", { chat_id: chatId, text, ...extra });
}

export function requestContact(chatId: number) {
  return sendMessage(chatId, "Bagikan kontak Telegram kamu untuk memverifikasi membership.", {
    reply_markup: {
      keyboard: [[{ text: "Bagikan kontak", request_contact: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
}

export function createInviteLink() {
  return telegram<{ invite_link: string }>("createChatInviteLink", {
    chat_id: env().TELEGRAM_GROUP_ID,
    name: `membership-${Date.now()}`,
    member_limit: 1,
    expire_date: Math.floor(Date.now() / 1000) + 15 * 60,
  });
}

export async function removeAndAllowRejoin(userId: number) {
  await telegram("banChatMember", { chat_id: env().TELEGRAM_GROUP_ID, user_id: userId, revoke_messages: false });
  await telegram("unbanChatMember", { chat_id: env().TELEGRAM_GROUP_ID, user_id: userId, only_if_banned: true });
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}
