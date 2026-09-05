import { isCronAuthorized } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { removeAndAllowRejoin } from "@/lib/telegram";
import type { Membership } from "@/lib/types";

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("claim_expired_memberships");
    if (error) throw error;
    const memberships = (data ?? []) as Membership[];
    const results = await Promise.all(memberships.map(async (item) => {
      if (!item.telegram_user_id) {
        const reason = "NO_TELEGRAM_USER_ID";
        await supabase.from("memberships").update({ kick_last_error: reason }).eq("id", item.id);
        return { id: item.id, kicked: false, reason };
      }
      try {
        await removeAndAllowRejoin(item.telegram_user_id);
        await supabase.from("memberships").update({ kick_processed_at: new Date().toISOString(), kick_last_error: null }).eq("id", item.id);
        return { id: item.id, kicked: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await supabase.from("memberships").update({ kick_last_error: message.slice(0, 1000) }).eq("id", item.id);
        return { id: item.id, kicked: false, error: message };
      }
    }));
    return Response.json({ processed: memberships.length, results });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Expiration job gagal" }, { status: 500 });
  }
}
