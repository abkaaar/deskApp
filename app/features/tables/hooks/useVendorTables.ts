import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuthStore } from '@/app/stores/authStore'
import { TableService } from '@/lib/services/tableService'
import type { RestaurantTable, RestaurantTableSession } from '@/lib/types/table'

export function useVendorTables() {
  const vendorId = useAuthStore((s) => s.profile?.id)
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [sessions, setSessions] = useState<RestaurantTableSession[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!vendorId) {
      setTables([])
      setSessions([])
      setLoading(false)
      return
    }

    const [tablesRes, sessionsRes] = await Promise.all([
      TableService.getTables(vendorId),
      TableService.getOpenSessions(vendorId),
    ])

    setError(tablesRes.error || sessionsRes.error)
    setTables(tablesRes.data)
    setSessions(sessionsRes.data)
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

  const upsertLocal = useCallback((table: RestaurantTable) => {
    setTables((prev) => {
      const index = prev.findIndex((item) => item.id === table.id)
      if (index === -1) {
        return [...prev, table].sort(
          (a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label),
        )
      }
      const next = [...prev]
      next[index] = table
      return next.sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label))
    })
  }, [])

  const removeLocal = useCallback((tableId: string) => {
    setTables((prev) => prev.filter((item) => item.id !== tableId))
  }, [])

  const stats = useMemo(
    () => ({
      total: tables.length,
      available: tables.filter((t) => t.status === 'available').length,
      occupied: tables.filter((t) => t.status === 'occupied').length,
      reserved: tables.filter((t) => t.status === 'reserved').length,
      cleaning: tables.filter((t) => t.status === 'cleaning').length,
    }),
    [tables],
  )

  return {
    vendorId,
    tables,
    sessions,
    loading,
    refreshing,
    error,
    stats,
    refresh,
    upsertLocal,
    removeLocal,
  }
}
