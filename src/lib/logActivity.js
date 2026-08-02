import { supabase } from './supabase'

export async function logActivity(action_type, detail, magasin_id = null) {
  try {
    const raw = localStorage.getItem('sebphone_user')
    const user = raw ? JSON.parse(raw) : {}
    await supabase.from('activity_log').insert({
      user_name: user.name || 'Admin',
      user_email: user.email || null,
      magasin_id: magasin_id || user.magasin_id || null,
      action_type,
      detail,
    })
  } catch (e) {
    console.error('logActivity error:', e)
  }
}
