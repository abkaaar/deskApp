import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuthStore } from '@/app/stores/authStore'
import { MenuService } from '@/lib/services/menuService'
import type { MenuPost } from '@/lib/types/menu'

export function useVendorMenuItems() {
  const vendorId = useAuthStore((s) => s.profile?.id)
  const [items, setItems] = useState<MenuPost[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!vendorId) {
      setItems([])
      setLoading(false)
      return
    }

    const result = await MenuService.getVendorMenu(vendorId)
    if (result.error) {
      setError(result.error)
      setItems([])
    } else {
      setError(null)
      setItems(result.data)
    }
    setLoading(false)
    setRefreshing(false)
  }, [vendorId])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await load()
  }, [load])

  const updateItemInList = useCallback((updated: MenuPost) => {
    setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
  }, [])

  const removeItemFromList = useCallback((postId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== postId))
  }, [])

  const addItemToList = useCallback((item: MenuPost) => {
    setItems((prev) => [item, ...prev])
  }, [])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  const categories = useMemo(() => {
    const grouped = items.reduce<Record<string, MenuPost[]>>((acc, item) => {
      const category = item.category?.trim() || 'Uncategorized'
      if (!acc[category]) acc[category] = []
      acc[category].push(item)
      return acc
    }, {})

    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))
  }, [items])

  const stats = useMemo(
    () => ({
      total: items.length,
      available: items.filter((item) => item.is_available !== false).length,
      unavailable: items.filter((item) => item.is_available === false).length,
    }),
    [items],
  )

  return {
    items,
    categories,
    stats,
    loading,
    refreshing,
    error,
    refresh,
    updateItemInList,
    removeItemFromList,
    addItemToList,
    vendorId,
  }
}
