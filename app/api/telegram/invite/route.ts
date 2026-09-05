import { z } from "zod";
import { effectiveStatus, findByTelegramUserId } from "@/lib/memberships";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createInviteLink } from "@/lib/telegram";

const schema = z.object({ telegram_user_id: z.coerce.number().int().positive() });

export async function POST(request: Request) {
  try {
    const input = schema.safeParse(await request.json());
    if (!input.success) return Response.json({ error: "Payload tidak valid" }, { status: 400 });
    const membership = await findByTelegramUserId(input.data.telegram_user_id);
    if (!membership) return Response.json({ error: "Membership tidak ditemukan" }, { status: 404 });
    if (effectiveStatus(membership) !== "ACTIVE") return Response.json({ error: "Membership sudah expired" }, { status: 403 });
    const invite = await createInviteLink();
    const { error } = await getSupabaseAdmin().from("invite_logs").insert({
      membership_id: membership.id, telegram_user_id: input.data.telegram_user_id, invite_link: invite.invite_link,
    });
    if (error) throw error;
    return Response.json({ invite_link: invite.invite_link, expires_in_seconds: 900 }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Gagal membuat invite" }, { status: 500 });
  }
}
