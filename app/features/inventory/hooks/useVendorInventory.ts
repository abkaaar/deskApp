import { useCallback, useEffect, useState } from 'react'

import { useAuthStore } from '@/app/stores/authStore'
import { InventoryService } from '@/lib/services/inventoryService'
import type {
  InventoryAlert,
  InventoryAnalytics,
  InventoryItem,
  InventoryMovement,
  VendorInventorySettings,
} from '@/lib/types/inventory'

export function useVendorInventory() {
  const vendorId = useAuthStore((s) => s.profile?.id)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [alerts, setAlerts] = useState<InventoryAlert[]>([])
  const [settings, setSettings] = useState<VendorInventorySettings | null>(null)
  const [analytics, setAnalytics] = useState<InventoryAnalytics | null>(null)
  const [recipes, setRecipes] = useState<import('@/lib/types/inventory').InventoryRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!vendorId) {
      setItems([])
      setMovements([])
      setAlerts([])
      setSettings(null)
      setAnalytics(null)
      setRecipes([])
      setLoading(false)
      return
    }

    setLoading(true)
    const [itemsRes, movementsRes, alertsRes, settingsRes, analyticsRes, recipesRes] =
      await Promise.all([
        InventoryService.getItems(vendorId),
        InventoryService.getMovements(vendorId, 50),
        InventoryService.getAlerts(vendorId),
        InventoryService.getSettings(vendorId),
        InventoryService.getAnalytics(vendorId, 30),
        InventoryService.getRecipes(vendorId),
      ])

    setItems(itemsRes.data)
    setMovements(movementsRes.data)
    setAlerts(alertsRes.data)
    setSettings(settingsRes.data)
    setAnalytics(analyticsRes.data)
    setRecipes(recipesRes.data)
    setError(
      itemsRes.error ||
        movementsRes.error ||
        alertsRes.error ||
        settingsRes.error ||
        analyticsRes.error ||
        recipesRes.error,
    )
    setLoading(false)
  }, [vendorId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    vendorId,
    items,
    movements,
    alerts,
    settings,
    analytics,
    recipes,
    loading,
    error,
    refresh,
    setSettings,
  }
}
