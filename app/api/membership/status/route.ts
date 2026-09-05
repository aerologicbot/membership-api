import { findByPhone, findByTelegramUserId, effectiveStatus } from "@/lib/memberships";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const phone = params.get("phone");
    const userId = params.get("telegram_user_id");
    if (!phone && !userId) return Response.json({ error: "phone atau telegram_user_id wajib diisi" }, { status: 400 });
    const membership = phone ? await findByPhone(phone) : await findByTelegramUserId(Number(userId));
    if (!membership) return Response.json({ error: "Membership tidak ditemukan" }, { status: 404 });
    return Response.json({ ...membership, status: effectiveStatus(membership) });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Gagal mengambil membership" }, { status: 500 });
  }
}
