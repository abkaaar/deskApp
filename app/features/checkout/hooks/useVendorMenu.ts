import { useEffect, useMemo, useState } from 'react'

import { useAuthStore } from '@/app/stores/authStore'
import { fetchVendorMenu } from '@/lib/checkout/posCheckoutService'
import type { MenuPost } from '@/lib/checkout/types'

export function useVendorMenu() {
  const vendorId = useAuthStore((s) => s.profile?.id)
  const [posts, setPosts] = useState<MenuPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!vendorId) {
      setPosts([])
      setIsLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const data = await fetchVendorMenu(vendorId!)
        if (!cancelled) setPosts(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load menu')
          setPosts([])
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [vendorId])

  const categories = useMemo(() => {
    const values = new Set<string>()
    for (const post of posts) {
      const category = post.category?.trim()
      values.add(category || 'Uncategorized')
    }
    return ['All', ...Array.from(values).sort((a, b) => a.localeCompare(b))]
  }, [posts])

  return { posts, categories, isLoading, error, vendorId }
}
