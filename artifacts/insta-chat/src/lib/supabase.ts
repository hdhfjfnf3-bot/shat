import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string;

/** Public client — used for realtime subscriptions (anon key) */
export const supabase = createClient(url, anonKey, {
  realtime: { params: { eventsPerSecond: 10 } },
});

/**
 * Admin client — used ONLY for auth (register / login / check-user).
 * Uses the service role key to bypass RLS on the users table.
 * Realtime is disabled since it's not needed here.
 */
export const supabaseAdmin = createClient(url, serviceKey ?? anonKey, {
  auth: { persistSession: false },
});

export function roomKey(a: string, b: string): string {
  return [a.toLowerCase(), b.toLowerCase()].sort().join("__");
}
