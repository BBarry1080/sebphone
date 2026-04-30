import { supabase, isSupabaseReady } from '../lib/supabase'
import { phonesMock } from './phonesMock'

export async function getPhones(filters = {}) {
  if (!isSupabaseReady) {
    let result = [...phonesMock]
    if (filters.condition) result = result.filter((p) => p.condition === filters.condition)
    if (filters.brand)     result = result.filter((p) => p.brand === filters.brand)
    if (filters.status)    result = result.filter((p) => p.status === filters.status)
    return result
  }
  let query = supabase
    .from('phones')
    .select('*, model:phone_models(*)')
    .order('created_at', { ascending: false })
  if (filters.condition) query = query.eq('condition', filters.condition)
  if (filters.brand)     query = query.eq('brand', filters.brand)
  if (filters.status)    query = query.eq('status', filters.status)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getPhoneById(id) {
  if (!isSupabaseReady) {
    const phone = phonesMock.find((p) => p.id === Number(id))
    if (!phone) throw new Error('Téléphone introuvable')
    return phone
  }
  const { data, error } = await supabase
    .from('phones')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function updatePhoneStatus(id, status) {
  if (!isSupabaseReady) return
  const { error } = await supabase.from('phones').update({ status }).eq('id', id)
  if (error) throw error
}

export async function updatePhonePrice(id, price) {
  if (!isSupabaseReady) return
  const { error } = await supabase.from('phones').update({ price }).eq('id', id)
  if (error) throw error
}

export async function addPhone(phoneData) {
  if (!isSupabaseReady) throw new Error('Supabase non configuré')
  const { data, error } = await supabase.from('phones').insert([phoneData]).select().single()
  if (error) throw error
  return data
}

export async function updatePhone(id, phoneData) {
  if (!isSupabaseReady) throw new Error('Supabase non configuré')
  const { data, error } = await supabase.from('phones').update(phoneData).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deletePhone(id) {
  if (!isSupabaseReady) throw new Error('Supabase non configuré')
  const { error } = await supabase.from('phones').delete().eq('id', id)
  if (error) throw error
}
