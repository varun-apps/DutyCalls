import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Surface a clear error during development if env is missing.
  console.warn(
    '[DutyCalls] Missing Supabase env vars. Copy .env.example to .env.local and fill in your project URL + anon key.'
  )
}

// NOTE: the client is loosely typed until `npm run supabase:types` generates a
// proper `database.types.ts` from the linked project. Query results are cast to
// the domain interfaces in src/types/db.ts at each call site.
export const supabase = createClient(
  supabaseUrl ?? 'http://localhost:54321',
  supabaseAnonKey ?? 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
)

/** Base URL for the deployed Edge Function (notify-group). */
export const functionBaseUrl =
  import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost:54321'

