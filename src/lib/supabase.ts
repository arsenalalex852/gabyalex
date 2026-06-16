import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !anon) {
  console.warn('Missing Supabase env vars. Copy .env.example to .env.local and fill them in.')
}

export const supabase = createClient(url, anon)
