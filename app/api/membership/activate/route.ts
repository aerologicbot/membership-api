import { z } from "zod";
import { isCronAuthorized } from "@/lib/auth";
import { DEFAULT_PACKAGE, PACKAGES } from "@/lib/catalog";
import { activateMembership, findMemberByEmail, startLink } from "@/lib/members";

// Titik sambung untuk payment gateway: webhook Midtrans memanggil endpoint ini
// setelah status pembayaran "settlement". Sampai gateway terpasang, endpoint
// ini juga cara admin mengaktifkan member secara manual.
const schema = z.object({
  email: z.email(),
  package: z.enum(Object.keys(PACKAGES) as [string, ...string[]]).default(DEFAULT_PACKAGE),
});

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Payload tidak valid", issues: z.treeifyError(parsed.error) }, { status: 400 });
  }

  try {
    const member = await findMemberByEmail(parsed.data.email);
    if (!member) return Response.json({ error: "Member tidak ditemukan" }, { status: 404 });

    // Aman dipanggil ulang: membership yang sudah ada diperpanjang, bukan
    // digandakan — webhook pembayaran sering mengirim notifikasi lebih dari sekali.
    const { membership, token } = await activateMembership(member.id, parsed.data.package as keyof typeof PACKAGES);

    return Response.json({
      start_url: startLink(token),
      membership: { id: membership.id, package: membership.package, expired_at: membership.expired_at },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Aktivasi gagal" }, { status: 500 });
  }
}
