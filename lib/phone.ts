export function normalizeIndonesianPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) throw new Error("Nomor telepon kosong");
  if (digits.startsWith("62")) return `+${digits}`;
  if (digits.startsWith("0")) return `+62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `+62${digits}`;
  return `+${digits}`;
}
