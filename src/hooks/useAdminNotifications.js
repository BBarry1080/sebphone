import { useEffect, useState } from 'react'
import { supabase, isSupabaseReady } from '../lib/supabase'

export function useAdminNotifications() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!isSupabaseReady) return

    let cancelled = false

    const fetchRecent = async () => {
      const { data } = await supabase
        .from('orders')
        .select(`
          id, created_at, status, final_price, total_amount,
          customer_name, customer_email,
          phone:phone_id (name, model)
        `)
        .order('created_at', { ascending: false })
        .limit(20)

      if (cancelled || !data) return

      setNotifications(
        data.map((o) => ({
          id: o.id,
          type: 'reservation',
          title: `Nouvelle réservation — ${o.phone?.name || o.phone?.model || 'Téléphone'}`,
          subtitle: `${o.customer_name || 'Client'} · ${o.final_price ?? o.total_amount ?? 0}€`,
          time: o.created_at,
          status: o.status,
          read: false,
        }))
      )
      setUnreadCount(
        data.filter((o) => {
          const age = Date.now() - new Date(o.created_at).getTime()
          return age < 24 * 60 * 60 * 1000
        }).length
      )
    }

    fetchRecent()

    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new
          const notif = {
            id: newOrder.id,
            type: 'reservation',
            title: '🔔 Nouvelle réservation !',
            subtitle: `${newOrder.customer_name || 'Client'} · ${newOrder.final_price ?? newOrder.total_amount ?? 50}€`,
            time: newOrder.created_at || new Date().toISOString(),
            status: newOrder.status,
            read: false,
          }
          setNotifications((prev) => [notif, ...prev.slice(0, 19)])
          setUnreadCount((prev) => prev + 1)
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'deliveries' },
        (payload) => {
          const d = payload.new
          const notif = {
            id: d.id,
            type: 'livraison',
            title: '🚗 Nouvelle livraison express !',
            subtitle: `${d.customer_name || 'Client'} · ${d.delivery_price ?? 0}€ · ${d.creneau || ''}`,
            time: d.created_at || new Date().toISOString(),
            status: d.status,
            read: false,
          }
          setNotifications((prev) => [notif, ...prev.slice(0, 19)])
          setUnreadCount((prev) => prev + 1)
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  return { notifications, unreadCount, markAllRead }
}
