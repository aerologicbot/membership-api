import { z } from "zod";
import { isCronAuthorized } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

const schema = z.object({ membership_id: z.uuid(), hours: z.coerce.number().positive().max(8760).default(1) });

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const input = schema.safeParse(await request.json());
    if (!input.success) return Response.json({ error: "Payload tidak valid", details: input.error.issues }, { status: 400 });
    const { data, error } = await getSupabaseAdmin().rpc("renew_membership", {
      p_membership_id: input.data.membership_id, p_hours: input.data.hours,
    });
    if (error) throw error;
    if (!data) return Response.json({ error: "Membership tidak ditemukan" }, { status: 404 });
    return Response.json({ membership: data });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Renewal gagal" }, { status: 500 });
  }
}
