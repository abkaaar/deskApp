import { useMemo, useState } from 'react'
import { Star } from 'lucide-react'

import { useAuthStore } from '@/app/stores/authStore'
import type { MenuAddon, MenuPost } from '@/lib/checkout/types'
import { MenuItemsService } from '@/lib/services/menuItemsService'

import { useCheckoutStore } from '../checkoutStore'
import { useVendorMenu } from '../hooks/useVendorMenu'
import { AddonPickerDialog } from './AddonPickerDialog'
import { ProductCard } from './ProductCard'

export function FavoritesPanel() {
  const profile = useAuthStore((s) => s.profile)
  const { posts, isLoading, error, vendorId } = useVendorMenu()
  const favoriteIds = useCheckoutStore((s) => s.favoriteIds)
  const toggleFavorite = useCheckoutStore((s) => s.toggleFavorite)
  const addItem = useCheckoutStore((s) => s.addItem)

  const [addonPick, setAddonPick] = useState<{
    post: MenuPost
    addons: MenuAddon[]
  } | null>(null)

  const favorites = useMemo(
    () => posts.filter((post) => favoriteIds.includes(post.id) && post.is_available !== false),
    [posts, favoriteIds],
  )

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
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading favorites...</p>
        )}
        {error && <p className="py-8 text-center text-sm text-destructive">{error}</p>}
        {!isLoading && !error && favorites.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <Star className="h-8 w-8 text-muted-foreground" />
            <p className="font-semibold">No favorites yet</p>
            <p className="text-xs text-muted-foreground">
              Pin items from Menu (star) for one-tap checkout.
            </p>
          </div>
        )}
        {!isLoading && !error && favorites.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2.5">
            {favorites.map((post) => (
              <ProductCard
                key={post.id}
                post={post}
                favorited
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
