import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cast a Supabase client to bypass generated type restrictions.
 * Use for tables that exist in migrations but haven't been added
 * to the generated types yet. Remove individual usages after
 * running `supabase gen types` to regenerate the types.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function untyped(client: any): SupabaseClient {
  return client as SupabaseClient;
}
