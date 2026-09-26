import { isTelegramAuthorized } from "@/lib/auth";
import { claimStartToken, findByStartToken } from "@/lib/members";
import { effectiveStatus, findByTelegramUserId } from "@/lib/memberships";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createInviteLink, formatDate, sendMessage } from "@/lib/telegram";
import type { Membership, TelegramUpdate } from "@/lib/types";

const HELP_TEXT =
  "Halo! Untuk bergabung ke grup VIP AeroLogic, buka link personal yang kamu terima setelah pembayaran.\n\n" +
  "Link-nya berbentuk t.me/…?start=… dan hanya berlaku untuk akun kamu.\n\n" +
  "Kalau link-nya hilang, hubungi admin.";

async function sendInvite(chatId: number, membership: Membership) {
  const invite = await createInviteLink();
  const { error } = await getSupabaseAdmin().from("invite_logs").insert({
    membership_id: membership.id,
    telegram_user_id: chatId,
    invite_link: invite.invite_link,
  });
  if (error) throw error;

  await sendMessage(
    chatId,
    `Membership kamu aktif.\n\nPaket: ${membership.package}\nBerlaku sampai: ${formatDate(membership.expired_at)}\n\n` +
      "Link di bawah hanya bisa dipakai satu orang dan kedaluwarsa dalam 15 menit.",
    { reply_markup: { inline_keyboard: [[{ text: "Gabung Grup VIP", url: invite.invite_link }]] } },
  );
}

// /start <token> — satu-satunya jalan masuk. Token dibuat saat pembayaran
// berhasil, jadi user tidak perlu membagikan kontak dan nomor WhatsApp di form
// tidak perlu sama dengan nomor akun Telegram-nya.
async function handleStart(chatId: number, userId: number, token: string | undefined) {
  if (!token) return sendMessage(chatId, HELP_TEXT);

  const membership = await findByStartToken(token);
  if (!membership) return sendMessage(chatId, "Link ini tidak dikenali. Pastikan kamu membuka link dari halaman pembayaran.");

  if (effectiveStatus(membership) !== "ACTIVE") {
    return sendMessage(chatId, `Membership ini sudah berakhir pada ${formatDate(membership.expired_at)}. Silakan perpanjang dulu.`);
  }

  // Token sudah dipakai akun lain: link ini milik orang lain, jangan beri akses.
  if (membership.start_token_used_at && membership.telegram_user_id && membership.telegram_user_id !== userId) {
    return sendMessage(chatId, "Link ini sudah dipakai akun Telegram lain. Hubungi admin kalau ini seharusnya milikmu.");
  }

  await claimStartToken(membership.id, userId);
  await sendInvite(chatId, membership);
}

async function handleStatus(chatId: number, userId: number) {
  const membership = await findByTelegramUserId(userId);
  if (!membership) {
    return sendMessage(chatId, "Akun Telegram ini belum terhubung ke membership mana pun. Buka link personal kamu dulu.");
  }
  if (effectiveStatus(membership) === "ACTIVE") {
    return sendMessage(
      chatId,
      `Membership AeroLogic\n\nStatus: AKTIF\nPaket: ${membership.package}\nMulai: ${formatDate(membership.started_at)}\nBerakhir: ${formatDate(membership.expired_at)}`,
    );
  }
  return sendMessage(
    chatId,
    `Membership AeroLogic\n\nStatus: BERAKHIR\nBerakhir pada: ${formatDate(membership.expired_at)}\n\nSilakan perpanjang untuk masuk kembali.`,
  );
}

export async function POST(request: Request) {
  if (!isTelegramAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const update = (await request.json()) as TelegramUpdate;
    const message = update.message;

    if (message?.text && message.from) {
      const [command, payload] = message.text.trim().split(/\s+/, 2);
      // Di grup, command datang sebagai "/start@NamaBot".
      const name = command.split("@")[0];
      if (name === "/start") await handleStart(message.chat.id, message.from.id, payload);
      else if (name === "/status") await handleStatus(message.chat.id, message.from.id);
    }

    const memberEvent = update.chat_member;
    if (
      memberEvent?.invite_link?.invite_link &&
      ["member", "administrator", "restricted"].includes(memberEvent.new_chat_member.status)
    ) {
      await getSupabaseAdmin()
        .from("invite_logs")
        .update({ used_at: new Date().toISOString() })
        .eq("invite_link", memberEvent.invite_link.invite_link)
        .is("used_at", null);
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    // 500 membuat Telegram mengirim ulang update yang sama, jadi kegagalan
    // sementara (Supabase down) tidak menghanguskan pendaftaran user.
    return Response.json({ error: "Webhook gagal diproses" }, { status: 500 });
  }
}
