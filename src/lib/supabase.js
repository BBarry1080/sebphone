import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Une URL Supabase valide commence obligatoirement par https://
const isValidUrl = (url) => typeof url === 'string' && url.startsWith('https://')

export const isSupabaseReady = isValidUrl(supabaseUrl) && !!supabaseKey

if (!isSupabaseReady) {
  console.warn(
    '⚠️ Supabase non configuré — mode mock activé.\n' +
    'Créez .env.local avec :\n' +
    '  VITE_SUPABASE_URL=https://xxxx.supabase.co\n' +
    '  VITE_SUPABASE_ANON_KEY=eyJ...'
  )
}

export const supabase = isSupabaseReady
  ? createClient(supabaseUrl, supabaseKey)
  : null
