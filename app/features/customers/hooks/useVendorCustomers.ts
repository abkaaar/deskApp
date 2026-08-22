import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuthStore } from '@/app/stores/authStore'
import { CustomerService } from '@/lib/services/customerService'
import type { VendorCustomer } from '@/lib/types/customer'

export function useVendorCustomers() {
  const vendorId = useAuthStore((s) => s.profile?.id)
  const [customers, setCustomers] = useState<VendorCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!vendorId) {
      setCustomers([])
      setLoading(false)
      return
    }

    const result = await CustomerService.getCustomers(vendorId)
    setError(result.error)
    setCustomers(result.data)
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

  const upsertLocal = useCallback((customer: VendorCustomer) => {
    setCustomers((prev) => {
      const index = prev.findIndex((item) => item.id === customer.id)
      if (index === -1) return [customer, ...prev]
      const next = [...prev]
      next[index] = customer
      return next
    })
  }, [])

  const removeLocal = useCallback((customerId: string) => {
    setCustomers((prev) => prev.filter((item) => item.id !== customerId))
  }, [])

  const stats = useMemo(
    () => ({
      total: customers.length,
      active: customers.filter((c) => c.is_active).length,
      lifetimeSpend: customers.reduce((sum, c) => sum + c.lifetime_spend, 0),
      totalOrders: customers.reduce((sum, c) => sum + c.total_orders, 0),
    }),
    [customers],
  )

  return {
    vendorId,
    customers,
    loading,
    refreshing,
    error,
    stats,
    refresh,
    upsertLocal,
    removeLocal,
  }
}
