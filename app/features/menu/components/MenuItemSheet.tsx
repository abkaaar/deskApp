import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet'
import { Switch } from '@/app/components/ui/switch'
import { MenuItemsService } from '@/lib/services/menuItemsService'
import { MenuService } from '@/lib/services/menuService'
import type { MenuItemAddon, MenuPost } from '@/lib/types/menu'

type MenuItemSheetProps = {
  item: MenuPost | null
  vendorId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (item: MenuPost) => void
  onRemoved: (postId: string) => void
}

export function MenuItemSheet({
  item,
  vendorId,
  open,
  onOpenChange,
  onUpdated,
  onRemoved,
}: MenuItemSheetProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [price, setPrice] = useState('')
  const [stockQuantity, setStockQuantity] = useState('')
  const [prepTime, setPrepTime] = useState('')
  const [isAvailable, setIsAvailable] = useState(true)
  const [fulfilmentMode, setFulfilmentMode] = useState<'ready' | 'made_to_order'>('made_to_order')
  const [addons, setAddons] = useState<MenuItemAddon[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingAddons, setLoadingAddons] = useState(false)

  useEffect(() => {
    if (!item) return

    setTitle(item.title)
    setDescription(item.description || '')
    setCategory(item.category || '')
    setPrice(item.price != null ? String(item.price) : '')
    setStockQuantity(item.stock_quantity != null ? String(item.stock_quantity) : '')
    setPrepTime(item.prep_time_minutes != null ? String(item.prep_time_minutes) : '')
    setIsAvailable(item.is_available !== false)
    setFulfilmentMode(item.fulfilment_mode === 'ready' ? 'ready' : 'made_to_order')

    if (item.id) {
      setLoadingAddons(true)
      void MenuItemsService.getMenuItems(item.id).then((result) => {
        setAddons(result.data)
        setLoadingAddons(false)
      })
    }
  }, [item])

  if (!item || !vendorId) return null

  const handleSave = async () => {
    setLoading(true)
    try {
      const parsedPrice = price.trim() ? Number.parseFloat(price) : null
      const parsedStock = stockQuantity.trim() ? Number.parseInt(stockQuantity, 10) : null
      const parsedPrep = prepTime.trim() ? Number.parseInt(prepTime, 10) : null

      const result = await MenuService.updateMenuItem(item.id, vendorId, {
        title: title.trim(),
        description: description.trim(),
        category: category.trim() || 'Uncategorized',
        price: parsedPrice,
        stock_quantity: parsedStock,
        prep_time_minutes: parsedPrep,
        is_available: isAvailable,
        fulfilment_mode: fulfilmentMode,
      })

      if (!result.success) {
        toast.error(result.error || 'Failed to update menu item')
        return
      }

      onUpdated({
        ...item,
        title: title.trim(),
        description: description.trim(),
        category: category.trim() || 'Uncategorized',
        price: parsedPrice,
        stock_quantity: parsedStock,
        prep_time_minutes: parsedPrep,
        is_available: isAvailable,
        fulfilment_mode: fulfilmentMode,
        updated_at: new Date().toISOString(),
      })

      toast.success('Menu updated', {
        description: 'Changes sync to POS, mobile app, storefront, and discovery website.',
      })
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async () => {
    setLoading(true)
    try {
      const result = await MenuService.softDeleteMenuItem(item.id, vendorId)
      if (!result.success) {
        toast.error(result.error || 'Failed to remove menu item')
        return
      }

      onRemoved(item.id)
      toast.success('Menu item removed')
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit menu item</SheetTitle>
          <SheetDescription>
            Updates sync automatically across all Foodma channels.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4 px-1">
          {item.image_url && (
            <img
              src={item.image_url}
              alt={item.title}
              className="h-40 w-full rounded-2xl object-cover"
            />
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Title
            </label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Category
              </label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Price (₦)
              </label>
              <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Stock
              </label>
              <Input
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                placeholder="Unlimited"
                inputMode="numeric"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Prep time (mins)
              </label>
              <Input value={prepTime} onChange={(e) => setPrepTime(e.target.value)} inputMode="numeric" />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border px-3 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Available on menu</p>
              <p className="text-xs text-muted-foreground">Hide items without deleting them</p>
            </div>
            <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
          </div>

          <div className="rounded-xl border border-border px-3 py-3 space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">Fulfilment</p>
              <p className="text-xs text-muted-foreground">
                Ready-to-serve skips kitchen after payment
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFulfilmentMode('ready')}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                  fulfilmentMode === 'ready'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border'
                }`}
              >
                Ready to serve
              </button>
              <button
                type="button"
                onClick={() => setFulfilmentMode('made_to_order')}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                  fulfilmentMode === 'made_to_order'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border'
                }`}
              >
                Made to order
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Add-ons</p>
            {loadingAddons ? (
              <p className="text-sm text-muted-foreground">Loading add-ons…</p>
            ) : addons.length === 0 ? (
              <p className="text-sm text-muted-foreground">No add-ons for this item.</p>
            ) : (
              <ul className="space-y-2">
                {addons.map((addon) => (
                  <li
                    key={addon.id}
                    className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm"
                  >
                    <span>{addon.title}</span>
                    <span className="text-primary">₦{addon.price}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2 pt-2">
            <Button className="w-full" disabled={loading} onClick={() => void handleSave()}>
              {loading ? 'Saving…' : 'Save changes'}
            </Button>
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              disabled={loading}
              onClick={() => void handleRemove()}
            >
              Remove from menu
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
