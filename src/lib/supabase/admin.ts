import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Server-side beheerclient voor webhook-schrijfacties.
 * Alleen gebruiken in route handlers of andere servercode.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase beheerclient is niet geconfigureerd. Zet NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY in de omgeving.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
