import { isCronAuthorized } from "@/lib/auth";
import { effectiveStatus, findByMemberEmail, findByTelegramUserId } from "@/lib/memberships";

// Bearer CRON_SECRET wajib: respons berisi data pribadi member, jadi endpoint
// ini hanya untuk pemanggil server-side (admin, job internal), bukan browser.
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const params = new URL(request.url).searchParams;
    const email = params.get("email");
    const userId = params.get("telegram_user_id");
    if (!email && !userId) {
      return Response.json({ error: "email atau telegram_user_id wajib diisi" }, { status: 400 });
    }

    const membership = email ? await findByMemberEmail(email) : await findByTelegramUserId(Number(userId));
    if (!membership) return Response.json({ error: "Membership tidak ditemukan" }, { status: 404 });

    return Response.json({ ...membership, status: effectiveStatus(membership) });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Gagal mengambil membership" }, { status: 500 });
  }
}
