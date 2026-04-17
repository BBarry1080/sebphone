import { useEffect, useState, useCallback } from 'react'
import { supabase, isSupabaseReady } from '../lib/supabase'
import { phonesMock } from '../data/phonesMock'

export function useInventory(filters = {}) {
  const [phones, setPhones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchPhones = useCallback(async () => {
    setLoading(true)

    // ── Mode mock (Supabase non configuré) ──────────────────────────
    if (!isSupabaseReady) {
      let result = [...phonesMock]
      if (filters.condition) result = result.filter((p) => p.condition === filters.condition)
      if (filters.brand)     result = result.filter((p) => p.brand === filters.brand)
      if (filters.status)    result = result.filter((p) => p.status === filters.status)
      setPhones(result)
      setLoading(false)
      return
    }

    // ── Mode Supabase ────────────────────────────────────────────────
    let query = supabase
      .from('phones')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters.condition) query = query.eq('condition', filters.condition)
    if (filters.brand)     query = query.eq('brand', filters.brand)
    if (filters.status)    query = query.eq('status', filters.status)

    const { data, error } = await query
    if (error) setError(error)
    else setPhones(data || [])
    setLoading(false)
  }, [filters.condition, filters.brand, filters.status])

  useEffect(() => {
    fetchPhones()

    if (!isSupabaseReady) return

    const channel = supabase
      .channel('phones-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'phones',
      }, () => fetchPhones())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchPhones])

  return { phones, loading, error, refetch: fetchPhones }
}
