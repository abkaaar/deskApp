import { useMemo, useState } from 'react'

import { useAuthStore } from '@/app/stores/authStore'
import type { MenuAddon, MenuPost } from '@/lib/checkout/types'
import { MenuItemsService } from '@/lib/services/menuItemsService'

import { useCheckoutStore } from '../checkoutStore'
import { useVendorMenu } from '../hooks/useVendorMenu'
import { AddonPickerDialog } from './AddonPickerDialog'
import { CategoryChips } from './CategoryChips'
import { ProductCard } from './ProductCard'

export function MenuPanel() {
  const profile = useAuthStore((s) => s.profile)
  const { posts, categories, isLoading, error, vendorId } = useVendorMenu()
  const searchQuery = useCheckoutStore((s) => s.searchQuery)
  const setSearchQuery = useCheckoutStore((s) => s.setSearchQuery)
  const activeCategory = useCheckoutStore((s) => s.activeCategory)
  const setActiveCategory = useCheckoutStore((s) => s.setActiveCategory)
  const addItem = useCheckoutStore((s) => s.addItem)
  const favoriteIds = useCheckoutStore((s) => s.favoriteIds)
  const toggleFavorite = useCheckoutStore((s) => s.toggleFavorite)

  const [addonPick, setAddonPick] = useState<{
    post: MenuPost
    addons: MenuAddon[]
  } | null>(null)

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return posts.filter((post) => {
      const category = post.category?.trim() || 'Uncategorized'
      if (activeCategory && category !== activeCategory) return false
      if (query && !post.title.toLowerCase().includes(query)) return false
      return true
    })
  }, [posts, searchQuery, activeCategory])

  const handleAdd = async (post: MenuPost) => {
    if (!vendorId) return
    const result = await MenuItemsService.getMenuItems(post.id)
    const addons: MenuAddon[] = (result.data ?? [])
      .map((a) => ({
        id: a.id,
        title: a.title,
        price: Number.parseFloat(a.price) || 0,
      }))
      .filter((a) => a.title)

    if (addons.length > 0) {
      setAddonPick({ post, addons })
      return
    }
    addItem(post, vendorId)
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <input
        type="search"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search menu"
        className="h-11 w-full rounded-full border border-border bg-muted px-4 text-sm outline-none focus:ring-2 focus:ring-primary"
      />
      <CategoryChips
        categories={categories}
        activeCategory={activeCategory}
        onSelect={setActiveCategory}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading menu...</p>
        )}
        {error && <p className="py-8 text-center text-sm text-destructive">{error}</p>}
        {!isLoading && !error && filtered.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <p className="font-semibold">No Menu Yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Sync from Foodma or add your first dish.
            </p>
          </div>
        )}
        {!isLoading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2.5">
            {filtered.map((post) => (
              <ProductCard
                key={post.id}
                post={post}
                favorited={favoriteIds.includes(post.id)}
                onToggleFavorite={
                  profile?.id ? () => toggleFavorite(profile.id, post.id) : undefined
                }
                onAdd={(p) => void handleAdd(p)}
              />
            ))}
          </div>
        )}
      </div>

      {addonPick && vendorId && (
        <AddonPickerDialog
          itemTitle={addonPick.post.title}
          basePrice={addonPick.post.price ?? 0}
          addons={addonPick.addons}
          onDismiss={() => setAddonPick(null)}
          onConfirm={(selected) => {
            addItem(addonPick.post, vendorId, selected)
            setAddonPick(null)
          }}
        />
      )}
    </section>
  )
}
