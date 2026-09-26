"use server";

import { env } from "@/lib/env";
import { DEFAULT_PACKAGE, isPackageCode, type PackageCode } from "@/lib/catalog";
import { DuplicateEmailError, activateMembership, createMember, startLink } from "@/lib/members";
import { registrationSchema } from "@/lib/types";

export type RegistrationState =
  | { status: "idle" }
  | { status: "error"; message?: string; fieldErrors: Record<string, string[]> }
  // startUrl null = sudah terdaftar tapi menunggu pembayaran; halaman sukses
  // menampilkan instruksi berbeda untuk dua keadaan ini.
  | { status: "success"; startUrl: string | null };

export async function register(
  _previous: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  const parsed = registrationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return { status: "error", fieldErrors };
  }

  const raw = formData.get("package");
  const packageCode: PackageCode =
    typeof raw === "string" && isPackageCode(raw) ? raw : DEFAULT_PACKAGE;

  try {
    // ponytail: tanpa rate limit — form ini publik, jadi satu skrip bisa
    // membanjiri tabel members. Constraint unique email menahan duplikat
    // sederhana saja. Tambahkan rate limit per IP (atau captcha) sebelum
    // link pendaftaran disebar luas.
    const member = await createMember(parsed.data);

    if (!env().AUTO_ACTIVATE_ON_REGISTER) {
      return { status: "success", startUrl: null };
    }

    const { token } = await activateMembership(member.id, packageCode);
    return { status: "success", startUrl: startLink(token) };
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      return { status: "error", fieldErrors: { email: [error.message] } };
    }
    console.error(error);
    return {
      status: "error",
      message: "Pendaftaran gagal diproses. Coba lagi sebentar lagi.",
      fieldErrors: {},
    };
  }
}
