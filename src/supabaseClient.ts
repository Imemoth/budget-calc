import { createClient } from "@supabase/supabase-js";
import type { Database } from "./lib/database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const isProd = import.meta.env.PROD;

if (!supabaseUrl || !supabaseAnonKey) {
  const msg = "Hiányzik a VITE_SUPABASE_URL vagy VITE_SUPABASE_ANON_KEY env változó.";
  // Prod-ban inkább álljon meg, különben csendben “local fallback” lesz és félrevezet.
  if (isProd) throw new Error(msg);
  console.warn(msg);
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Ezek alapból is jellemzően true-k, de így explicit és stabil (redirect/magic link esetén is).
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
