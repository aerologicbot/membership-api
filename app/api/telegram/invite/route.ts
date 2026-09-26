import { z } from "zod";
import { isCronAuthorized } from "@/lib/auth";
import { effectiveStatus, findByTelegramUserId } from "@/lib/memberships";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createInviteLink } from "@/lib/telegram";

const schema = z.object({ telegram_user_id: z.coerce.number().int().positive() });

// Bearer CRON_SECRET wajib: tanpa itu siapa pun yang menebak telegram_user_id
// member bisa memanen undangan grup VIP. Jalur normal user adalah /start
// <token> di bot; endpoint ini untuk admin menerbitkan ulang undangan.
export async function POST(request: Request) {
  if (!isCronAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const input = schema.safeParse(await request.json());
    if (!input.success) return Response.json({ error: "Payload tidak valid" }, { status: 400 });

    const membership = await findByTelegramUserId(input.data.telegram_user_id);
    if (!membership) return Response.json({ error: "Membership tidak ditemukan" }, { status: 404 });
    if (effectiveStatus(membership) !== "ACTIVE") return Response.json({ error: "Membership sudah expired" }, { status: 403 });

    const invite = await createInviteLink();
    const { error } = await getSupabaseAdmin().from("invite_logs").insert({
      membership_id: membership.id,
      telegram_user_id: input.data.telegram_user_id,
      invite_link: invite.invite_link,
    });
    if (error) throw error;

    return Response.json({ invite_link: invite.invite_link, expires_in_seconds: 900 }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Gagal membuat invite" }, { status: 500 });
  }
}
