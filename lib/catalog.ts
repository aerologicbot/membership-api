// Satu-satunya sumber kebenaran untuk pilihan di form pendaftaran dan paket
// membership. Form, schema Zod, dan tampilan admin semuanya membaca dari sini,
// jadi menambah/mengubah opsi cukup di file ini.
//
// Kode (kiri) disimpan ke database dan tidak boleh diubah setelah ada data.
// Label (kanan) yang dilihat user dan bebas diubah kapan saja.

export const GENDERS = {
  LAKI_LAKI: "Laki-laki",
  PEREMPUAN: "Perempuan",
} as const;

export const EXPERIENCE_LEVELS = {
  BARU: "Baru mulai (< 1 tahun)",
  MENENGAH: "1–3 tahun",
  BERPENGALAMAN: "3–5 tahun",
  SENIOR: "Lebih dari 5 tahun",
} as const;

export const CAPITAL_RANGES = {
  DI_BAWAH_5JT: "Di bawah Rp5 juta",
  ANTARA_5_25JT: "Rp5 juta – Rp25 juta",
  ANTARA_25_100JT: "Rp25 juta – Rp100 juta",
  DI_ATAS_100JT: "Di atas Rp100 juta",
} as const;

export const REFERRAL_SOURCES = {
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  X: "X / Twitter",
  FACEBOOK: "Facebook",
  TEMAN: "Teman atau kenalan",
  GRUP_TELEGRAM: "Grup Telegram lain",
  LAINNYA: "Lainnya",
} as const;

// Harga dan durasi paket. PRODUCT.md hanya menyebut satu angka resmi —
// Rp99.000 per bulan — jadi hanya itu yang ada di sini. Menambah paket =
// menambah satu baris; jangan mengarang harga yang belum diputuskan.
export const PACKAGES = {
  "1_BULAN": { label: "1 Bulan", durationDays: 30, priceIdr: 99_000 },
} as const;

export type PackageCode = keyof typeof PACKAGES;

export const DEFAULT_PACKAGE: PackageCode = "1_BULAN";

export function isPackageCode(value: string): value is PackageCode {
  return value in PACKAGES;
}

// Helper untuk merender <select> dan membangun enum Zod dari objek di atas.
export function options(source: Record<string, string>) {
  return Object.entries(source).map(([value, label]) => ({ value, label }));
}

export function codesOf(source: Record<string, string>): [string, ...string[]] {
  const keys = Object.keys(source);
  return [keys[0], ...keys.slice(1)];
}

export function formatIdr(amount: number) {
  return `Rp${amount.toLocaleString("id-ID")}`;
}
