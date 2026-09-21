import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAuthStore } from '@/app/stores/authStore'
import { splitKitchenColumns } from '@/lib/kds/ticket'
import { OrderService } from '@/lib/services/orderService'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Order, OrderStatus } from '@/lib/types/order'

const REALTIME_DEBOUNCE_MS = 300

/** Higher index = further along kitchen flow (for merge protection). */
const STATUS_RANK: Partial<Record<OrderStatus, number>> = {
  pending: 0,
  confirmed: 1,
  preparing: 2,
  ready: 3,
  delivered: 4,
  cancelled: 5,
}

function playNewTicketChime() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.value = 0.08
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22)
    osc.stop(ctx.currentTime + 0.22)
    window.setTimeout(() => void ctx.close(), 400)
  } catch {
    // Audio may be blocked until user gesture; ignore.
  }
}

function mergeFetchedOrders(
  prev: Order[],
  incoming: Order[],
  optimisticUntil: Map<string, { status: OrderStatus; until: number }>,
): Order[] {
  const now = Date.now()
  const byId = new Map(incoming.map((o) => [String(o.id), o]))

  // Preserve optimistic bumps briefly if fetch is stale
  for (const [id, opt] of optimisticUntil) {
    if (opt.until < now) {
      optimisticUntil.delete(id)
      continue
    }
    const remote = byId.get(id)
    const local = prev.find((o) => String(o.id) === id)
    if (!remote || !local) continue
    const remoteRank = STATUS_RANK[remote.status] ?? -1
    const optRank = STATUS_RANK[opt.status] ?? -1
    if (optRank > remoteRank) {
      byId.set(id, {
        ...remote,
        status: opt.status,
        ...(opt.status === 'delivered'
          ? { delivered_at: local.delivered_at || remote.delivered_at }
          : opt.status === 'ready' && local.status === 'delivered'
            ? { delivered_at: undefined }
            : {}),
      })
    } else {
      optimisticUntil.delete(id)
    }
  }

  return Array.from(byId.values())
}

export function useKitchenOrders() {
  const vendorId = useAuthStore((s) => s.profile?.id)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(() => new Set())
  const [flashIds, setFlashIds] = useState<Set<string>>(() => new Set())

  const prevPreparingRef = useRef<Set<string> | null>(null)
  const flashTimers = useRef<Map<string, number>>(new Map())
  const fetchGenerationRef = useRef(0)
  const optimisticUntilRef = useRef(
    new Map<string, { status: OrderStatus; until: number }>(),
  )
  const debounceTimerRef = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    if (!vendorId) {
      setOrders([])
      setLoading(false)
      return
    }

    const generation = ++fetchGenerationRef.current
    try {
      const result = await OrderService.getVendorOrders(vendorId, 80, 0)
      if (generation !== fetchGenerationRef.current) return

      if (result.error) {
        setError(result.error)
        return
      }

      setError(null)
      setOrders((prev) =>
        mergeFetchedOrders(prev, result.data, optimisticUntilRef.current),
      )
    } finally {
      if (generation === fetchGenerationRef.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [vendorId])

  const scheduleRefresh = useCallback(() => {
    if (debounceTimerRef.current != null) {
      window.clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null
      void refresh()
    }, REALTIME_DEBOUNCE_MS)
  }, [refresh])

  useEffect(() => {
    setLoading(true)
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!vendorId) return

    const supabase = getSupabaseClient()
    const channel = supabase
      .channel(`kds:${vendorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `vendor_id=eq.${vendorId}`,
        },
        () => {
          scheduleRefresh()
        },
      )
      .subscribe()

    return () => {
      if (debounceTimerRef.current != null) {
        window.clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      void supabase.removeChannel(channel)
    }
  }, [vendorId, scheduleRefresh])

  const columns = useMemo(() => splitKitchenColumns(orders), [orders])

  useEffect(() => {
    const ids = new Set(columns.preparing.map((o) => String(o.id)))
    const prev = prevPreparingRef.current
    if (prev) {
      const newcomers: string[] = []
      for (const id of ids) {
        if (!prev.has(id)) newcomers.push(id)
      }
      if (newcomers.length > 0) {
        playNewTicketChime()
        setFlashIds((cur) => {
          const next = new Set(cur)
          newcomers.forEach((id) => next.add(id))
          return next
        })
        newcomers.forEach((id) => {
          const existing = flashTimers.current.get(id)
          if (existing) window.clearTimeout(existing)
          const timer = window.setTimeout(() => {
            setFlashIds((cur) => {
              const next = new Set(cur)
              next.delete(id)
              return next
            })
            flashTimers.current.delete(id)
          }, 4000)
          flashTimers.current.set(id, timer)
        })
      }
    }
    prevPreparingRef.current = ids
  }, [columns.preparing])

  useEffect(() => {
    return () => {
      flashTimers.current.forEach((t) => window.clearTimeout(t))
      flashTimers.current.clear()
    }
  }, [])

  const bumpOrder = useCallback(
    async (order: Order, nextStatus: OrderStatus): Promise<{ success: boolean }> => {
      if (!vendorId) return { success: false }

      const id = String(order.id)
      setUpdatingIds((cur) => {
        const next = new Set(cur)
        next.add(id)
        return next
      })

      try {
        const deliveredAt =
          nextStatus === 'delivered' ? new Date().toISOString() : undefined

        const result = await OrderService.updateOrderStatus(
          order.id,
          nextStatus,
          vendorId,
          nextStatus === 'delivered'
            ? { delivered_at: deliveredAt }
            : nextStatus === 'ready' && order.status === 'delivered'
              ? { delivered_at: null }
              : undefined,
        )

        if (!result.success) {
          return { success: false }
        }

        optimisticUntilRef.current.set(id, {
          status: nextStatus,
          until: Date.now() + 8_000,
        })

        setOrders((prev) =>
          prev.map((row) =>
            row.id === order.id
              ? {
                  ...row,
                  status: nextStatus,
                  kitchen_status:
                    nextStatus === 'delivered'
                      ? 'completed'
                      : nextStatus === 'ready'
                        ? 'ready'
                        : nextStatus === 'preparing'
                          ? 'preparing'
                          : nextStatus === 'cancelled'
                            ? 'cancelled'
                            : row.kitchen_status,
                  ...(nextStatus === 'delivered'
                    ? { delivered_at: deliveredAt }
                    : nextStatus === 'ready' && order.status === 'delivered'
                      ? { delivered_at: undefined }
                      : {}),
                }
              : row,
          ),
        )

        return { success: true }
      } finally {
        setUpdatingIds((cur) => {
          const next = new Set(cur)
          next.delete(id)
          return next
        })
      }
    },
    [vendorId],
  )

  return {
    vendorId,
    orders,
    columns,
    loading,
    refreshing,
    error,
    refresh,
    bumpOrder,
    updatingIds,
    flashIds,
  }
}
