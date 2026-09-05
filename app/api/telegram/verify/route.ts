import { z } from "zod";
import { bindTelegramUser, effectiveStatus, findByPhone } from "@/lib/memberships";

const schema = z.object({ phone: z.string().min(5), telegram_user_id: z.coerce.number().int().positive() });

export async function POST(request: Request) {
  try {
    const input = schema.safeParse(await request.json());
    if (!input.success) return Response.json({ error: "Payload tidak valid", details: input.error.issues }, { status: 400 });
    const membership = await findByPhone(input.data.phone);
    if (!membership) return Response.json({ verified: false, reason: "NOT_FOUND" }, { status: 404 });
    if (effectiveStatus(membership) !== "ACTIVE") return Response.json({ verified: false, reason: "EXPIRED", membership }, { status: 403 });
    await bindTelegramUser(membership.id, input.data.telegram_user_id);
    return Response.json({ verified: true, membership: { ...membership, telegram_user_id: input.data.telegram_user_id } });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Verifikasi gagal" }, { status: 500 });
  }
}
