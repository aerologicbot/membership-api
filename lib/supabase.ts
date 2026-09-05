import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { env } from "@/lib/env";

export function getSupabaseAdmin() {
  const config = env();
  return createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: WebSocket as unknown as typeof globalThis.WebSocket },
  });
}
