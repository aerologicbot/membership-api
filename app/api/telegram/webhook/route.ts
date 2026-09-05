import { isTelegramAuthorized } from "@/lib/auth";
import { bindTelegramUser, effectiveStatus, findByPhone, findByTelegramUserId } from "@/lib/memberships";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createInviteLink, formatDate, requestContact, sendMessage } from "@/lib/telegram";
import type { TelegramUpdate } from "@/lib/types";

async function sendMembershipInvite(chatId: number, userId: number, membership: NonNullable<Awaited<ReturnType<typeof findByPhone>>>) {
  const invite = await createInviteLink();
  const { error } = await getSupabaseAdmin().from("invite_logs").insert({ membership_id: membership.id, telegram_user_id: userId, invite_link: invite.invite_link });
  if (error) throw error;
  await sendMessage(chatId, `Membership kamu ACTIVE.\n\nPaket: ${membership.package}\nBerakhir: ${formatDate(membership.expired_at)}\n\nLink hanya berlaku 15 menit dan untuk 1 orang.`, {
    reply_markup: { inline_keyboard: [[{ text: "Gabung Premium Group", url: invite.invite_link }]] },
  });
}

export async function POST(request: Request) {
  if (!isTelegramAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const update = (await request.json()) as TelegramUpdate;
    const message = update.message;
    if (message?.text === "/start") await requestContact(message.chat.id);
    else if (message?.text === "/status") {
      const membership = message.from ? await findByTelegramUserId(message.from.id) : null;
      if (!membership) await sendMessage(message.chat.id, "Membership belum terhubung. Jalankan /start lalu bagikan kontak kamu.");
      else if (effectiveStatus(membership) === "ACTIVE") await sendMessage(message.chat.id, `Premium Membership\n\nStatus: ACTIVE\nPaket: ${membership.package}\nMulai: ${formatDate(membership.started_at)}\nBerakhir: ${formatDate(membership.expired_at)}`);
      else await sendMessage(message.chat.id, `Premium Membership\n\nStatus: EXPIRED\nBerakhir: ${formatDate(membership.expired_at)}\n\nSilakan renew membership kamu.`);
    } else if (message?.contact && message.from) {
      if (message.contact.user_id !== message.from.id) {
        await sendMessage(message.chat.id, "Kontak harus merupakan kontak Telegram milikmu sendiri.");
      } else {
        const membership = await findByPhone(message.contact.phone_number);
        if (!membership) await sendMessage(message.chat.id, "Membership untuk nomor Telegram ini tidak ditemukan.");
        else if (effectiveStatus(membership) !== "ACTIVE") await sendMessage(message.chat.id, `Membership kamu sudah expired pada ${formatDate(membership.expired_at)}. Silakan renew terlebih dahulu.`);
        else {
          await bindTelegramUser(membership.id, message.from.id);
          await sendMembershipInvite(message.chat.id, message.from.id, membership);
        }
      }
    }
    const memberEvent = update.chat_member;
    if (memberEvent?.invite_link?.invite_link && ["member", "administrator", "restricted"].includes(memberEvent.new_chat_member.status)) {
      await getSupabaseAdmin().from("invite_logs").update({ used_at: new Date().toISOString() }).eq("invite_link", memberEvent.invite_link.invite_link).is("used_at", null);
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Webhook gagal diproses" }, { status: 500 });
  }
}
