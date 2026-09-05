import fs from "node:fs";

for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
  const separator = trimmed.indexOf("=");
  process.env[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim();
}

const secret = process.env.CRON_SECRET;
const baseUrl = process.env.LOCAL_APP_URL ?? "http://localhost:3000";

if (!secret) throw new Error("CRON_SECRET tidak ditemukan di .env");

async function runExpiration() {
  const timestamp = new Date().toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" });
  try {
    const response = await fetch(`${baseUrl}/api/cron/expire`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
    });
    const body = await response.text();
    console.log(`[${timestamp}] HTTP ${response.status} ${body}`);
  } catch (error) {
    console.error(`[${timestamp}] Cron gagal:`, error instanceof Error ? error.message : error);
  }
}

console.log(`Local expiration cron aktif: ${baseUrl}/api/cron/expire (setiap 60 detik)`);
await runExpiration();
setInterval(runExpiration, 60_000);
