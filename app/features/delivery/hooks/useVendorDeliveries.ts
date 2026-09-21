import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuthStore } from '@/app/stores/authStore'
import {
  isActiveDelivery,
  needsDeliveryAssignment,
} from '@/lib/delivery/status'
import { DeliveryService } from '@/lib/services/deliveryService'
import { OrderService } from '@/lib/services/orderService'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Delivery } from '@/lib/types/delivery'
import type { Order } from '@/lib/types/order'

export function useVendorDeliveries() {
  const vendorId = useAuthStore((s) => s.profile?.id)
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!vendorId) {
      setDeliveries([])
      setOrders([])
      setLoading(false)
      return
    }

    const [deliveriesRes, ordersRes] = await Promise.all([
      DeliveryService.getVendorDeliveries(vendorId, { includeCompleted: true, limit: 80 }),
      OrderService.getVendorOrders(vendorId, 60, 0),
    ])

    setError(deliveriesRes.error || ordersRes.error)
    setDeliveries(deliveriesRes.data)
    setOrders(ordersRes.data)
    setLoading(false)
    setRefreshing(false)
  }, [vendorId])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await load()
  }, [load])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  useEffect(() => {
    if (!vendorId) return

    const supabase = getSupabaseClient()
    const channel = supabase
      .channel(`desktop-deliveries-${vendorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deliveries',
          filter: `vendor_id=eq.${vendorId}`,
        },
        () => {
          void refresh()
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `vendor_id=eq.${vendorId}`,
        },
        () => {
          void refresh()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [vendorId, refresh])

  const active = useMemo(
    () => deliveries.filter((d) => isActiveDelivery(d.status)),
    [deliveries],
  )

  const completed = useMemo(
    () =>
      deliveries.filter((d) => d.status === 'delivered' || d.status === 'cancelled').slice(0, 30),
    [deliveries],
  )

  const unassignedOrders = useMemo(() => {
    const deliveryByOrder = new Map(deliveries.map((d) => [d.order_id, d]))
    return orders.filter((order) => {
      if (!needsDeliveryAssignment(order)) return false
      const linked = deliveryByOrder.get(String(order.id))
      if (!linked) return true
      return linked.status === 'cancelled'
    })
  }, [orders, deliveries])

  const withBusy = useCallback(
    async (id: string, action: () => Promise<{ success: boolean; error: string | null }>) => {
      setBusyId(id)
      const result = await action()
      setBusyId(null)
      if (result.success) await refresh()
      return result
    },
    [refresh],
  )

  return {
    vendorId,
    deliveries,
    active,
    completed,
    unassignedOrders,
    loading,
    refreshing,
    error,
    busyId,
    refresh,
    withBusy,
  }
}
