import { test } from "node:test";
import assert from "node:assert/strict";
import { registrationSchema } from "./types.ts";
import { normalizeIndonesianPhone } from "./phone.ts";

const valid = {
  full_name: "Dimas Prayoga",
  email: "Dimas@Email.com",
  whatsapp: "0812 3456 7890",
  telegram_username: "@dimasprayoga",
  gender: "LAKI_LAKI",
  experience_level: "MENENGAH",
  capital_range: "ANTARA_5_25JT",
  referral_source: "INSTAGRAM",
};

function parse(overrides: Partial<typeof valid> = {}) {
  return registrationSchema.safeParse({ ...valid, ...overrides });
}

test("menormalkan email, nomor, dan username sebelum disimpan", () => {
  const result = parse();
  assert.equal(result.success, true);
  assert.equal(result.data!.email, "dimas@email.com");
  assert.equal(result.data!.whatsapp, "+6281234567890");
  assert.equal(result.data!.telegram_username, "dimasprayoga");
});

// Dua tulisan nomor yang sama harus menghasilkan satu nilai tersimpan,
// supaya satu orang tidak bisa terdaftar dua kali.
test("0812..., 62812..., dan +62 812 ... jadi nilai yang sama", () => {
  const forms = ["081234567890", "6281234567890", "+62 812-3456-7890"];
  const normalized = forms.map((value) => parse({ whatsapp: value }).data!.whatsapp);
  assert.deepEqual(new Set(normalized), new Set(["+6281234567890"]));
});

test("menolak username Telegram yang tidak memenuhi aturan Telegram", () => {
  for (const bad of ["abc", "1username", "user name", "user-name", "a".repeat(33)]) {
    assert.equal(parse({ telegram_username: bad }).success, false, `seharusnya ditolak: ${bad}`);
  }
  for (const good of ["abcde", "Dimas_99", "a".repeat(32)]) {
    assert.equal(parse({ telegram_username: good }).success, true, `seharusnya diterima: ${good}`);
  }
});

test("menolak email dan nama yang tidak valid", () => {
  assert.equal(parse({ email: "bukan-email" }).success, false);
  assert.equal(parse({ full_name: "D" }).success, false);
});

// Nilai dropdown yang tidak dikenal berarti request dipalsukan, bukan salah
// ketik user — harus ditolak, bukan disimpan apa adanya.
test("menolak kode pilihan di luar katalog", () => {
  assert.equal(parse({ gender: "OTHER" }).success, false);
  assert.equal(parse({ experience_level: "" }).success, false);
  assert.equal(parse({ referral_source: "TIKTOKK" }).success, false);
});

test("nomor tanpa digit ditolak, bukan bikin crash", () => {
  assert.throws(() => normalizeIndonesianPhone("abc"));
  assert.equal(parse({ whatsapp: "abcdefgh" }).success, false);
});
