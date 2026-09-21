import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAuthStore } from '@/app/stores/authStore'
import { computeDashboardStats, type DashboardStats } from '@/lib/dashboard/stats'
import { DeliveryService } from '@/lib/services/deliveryService'
import { OrderService } from '@/lib/services/orderService'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Delivery } from '@/lib/types/delivery'
import type { Order } from '@/lib/types/order'

const FETCH_LIMIT = 200

const EMPTY_STATS: DashboardStats = {
  todaysRevenue: 0,
  ordersToday: 0,
  walkInOrders: 0,
  onlineOrders: 0,
  pendingKitchenOrders: 0,
  activeDeliveries: 0,
  customersServed: 0,
  averageOrderValue: 0,
  peakHour: null,
  cashDrawer: {
    status: 'idle',
    cashCollected: 0,
    transactionCount: 0,
  },
}

export function useVendorDashboard() {
  const vendorId = useAuthStore((s) => s.profile?.id)
  const [orders, setOrders] = useState<Order[]>([])
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchGenerationRef = useRef(0)

  const fetchDashboard = useCallback(async () => {
    if (!vendorId) {
      setOrders([])
      setDeliveries([])
      setLoading(false)
      return
    }

    const generation = ++fetchGenerationRef.current

    try {
      const [ordersResult, deliveriesResult] = await Promise.all([
        OrderService.getVendorOrders(vendorId, FETCH_LIMIT, 0),
        DeliveryService.getVendorDeliveries(vendorId, { includeCompleted: false, limit: 80 }),
      ])

      if (generation !== fetchGenerationRef.current) return

      if (ordersResult.error && deliveriesResult.error) {
        setError(ordersResult.error || deliveriesResult.error)
        return
      }

      setError(ordersResult.error || deliveriesResult.error)
      setOrders(ordersResult.data)
      setDeliveries(deliveriesResult.data)
    } finally {
      if (generation === fetchGenerationRef.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [vendorId])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await fetchDashboard()
  }, [fetchDashboard])

  useEffect(() => {
    setLoading(true)
    void fetchDashboard()
  }, [fetchDashboard])

  useEffect(() => {
    if (!vendorId) return

    const supabase = getSupabaseClient()
    const channel = supabase
      .channel(`dashboard:${vendorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `vendor_id=eq.${vendorId}`,
        },
        () => {
          void fetchDashboard()
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deliveries', filter: `vendor_id=eq.${vendorId}` },
        () => {
          void fetchDashboard()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [vendorId, fetchDashboard])

  const stats = useMemo(
    () => (vendorId ? computeDashboardStats(orders, deliveries, vendorId) : EMPTY_STATS),
    [orders, deliveries, vendorId],
  )

  return {
    vendorId,
    stats,
    loading,
    refreshing,
    error,
    refresh,
  }
}
