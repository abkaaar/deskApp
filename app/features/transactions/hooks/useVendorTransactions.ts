import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAuthStore } from '@/app/stores/authStore'
import { isWalkInOrder } from '@/lib/dashboard/stats'
import { parsePosNotes } from '@/lib/checkout/pos-order'
import { OrderService } from '@/lib/services/orderService'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { PaymentMethod } from '@/lib/checkout/types'
import type { Order } from '@/lib/types/order'

const PAGE_SIZE = 40

export type TransactionFilter = 'all' | 'cash' | 'card' | 'transfer' | 'online'

export type TransactionRow = {
  order: Order
  source: 'pos' | 'online'
  paymentMethod: PaymentMethod | 'online' | 'unknown'
  customerLabel: string
}

function toTransactionRow(order: Order): TransactionRow {
  const walkIn = isWalkInOrder(order)
  const meta = parsePosNotes(order.notes)
  const paymentMethod: TransactionRow['paymentMethod'] = walkIn
    ? meta?.paymentMethod ?? 'cash'
    : 'online'

  const customerLabel =
    meta?.customerName?.trim() ||
    order.buyer?.name ||
    order.buyer?.username ||
    (walkIn ? 'Walk-in guest' : 'Customer')

  return {
    order,
    source: walkIn ? 'pos' : 'online',
    paymentMethod,
    customerLabel,
  }
}

export function useVendorTransactions() {
  const vendorId = useAuthStore((s) => s.profile?.id)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const pageRef = useRef(0)
  const fetchGenerationRef = useRef(0)

  const fetchOrders = useCallback(
    async (loadMore = false) => {
      if (!vendorId) {
        setOrders([])
        setLoading(false)
        return
      }

      if (loadMore && (loadingMore || !hasMore)) return

      const currentPage = loadMore ? pageRef.current + 1 : 0
      const offset = currentPage * PAGE_SIZE

      if (!loadMore) {
        fetchGenerationRef.current += 1
      }
      const generation = fetchGenerationRef.current

      try {
        if (loadMore) {
          setLoadingMore(true)
        } else if (!refreshing) {
          setLoading(true)
        }

        const result = await OrderService.getVendorOrders(vendorId, PAGE_SIZE, offset)
        if (generation !== fetchGenerationRef.current) return

        if (result.error) {
          setError(result.error)
          return
        }

        setError(null)
        setHasMore(result.hasMore)
        pageRef.current = currentPage

        if (loadMore) {
          setOrders((prev) => {
            const existing = new Set(prev.map((o) => o.id))
            const next = result.data.filter((o) => !existing.has(o.id))
            return [...prev, ...next]
          })
        } else {
          setOrders(result.data)
        }
      } finally {
        if (generation === fetchGenerationRef.current) {
          setLoading(false)
          setRefreshing(false)
          setLoadingMore(false)
        }
      }
    },
    [vendorId, hasMore, loadingMore, refreshing],
  )

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await fetchOrders(false)
  }, [fetchOrders])

  const loadMore = useCallback(async () => {
    await fetchOrders(true)
  }, [fetchOrders])

  useEffect(() => {
    setLoading(true)
    void fetchOrders(false)
  }, [fetchOrders])

  useEffect(() => {
    if (!vendorId) return

    const supabase = getSupabaseClient()
    const channel = supabase
      .channel(`transactions:${vendorId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        void fetchOrders(false)
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [vendorId, fetchOrders])

  const transactions = useMemo(() => {
    return orders
      .filter((order) => order.status !== 'cancelled' && order.status !== 'pending_payment')
      .filter(
        (order) =>
          order.payment_status === 'paid' ||
          isWalkInOrder(order) ||
          order.status === 'delivered',
      )
      .map(toTransactionRow)
  }, [orders])

  return {
    vendorId,
    transactions,
    loading,
    refreshing,
    loadingMore,
    error,
    hasMore,
    refresh,
    loadMore,
  }
}
