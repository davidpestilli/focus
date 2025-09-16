import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl || supabaseUrl === 'your_supabase_url') {
  throw new Error(`Missing or invalid VITE_SUPABASE_URL. Current value: ${supabaseUrl}`)
}

if (!supabaseAnonKey || supabaseAnonKey === 'your_supabase_anon_key') {
  throw new Error(`Missing or invalid VITE_SUPABASE_ANON_KEY. Current value: ${supabaseAnonKey}`)
}

// Validate URL format
try {
  new URL(supabaseUrl)
} catch (error) {
  throw new Error(`Invalid VITE_SUPABASE_URL format: ${supabaseUrl}`)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)