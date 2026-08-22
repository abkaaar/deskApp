import { useMemo, useState } from 'react'
import { Plus, RefreshCw, Search, UtensilsCrossed } from 'lucide-react'
import { toast } from 'sonner'

import { useAuthStore } from '@/app/stores/authStore'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import { MenuService } from '@/lib/services/menuService'
import type { MenuPost } from '@/lib/types/menu'

import { CreateMenuItemSheet } from './components/CreateMenuItemSheet'
import { MenuItemCard } from './components/MenuItemCard'
import { MenuItemSheet } from './components/MenuItemSheet'
import { useVendorMenuItems } from './hooks/useVendorMenuItems'

export function MenuPage() {
  const profile = useAuthStore((s) => s.profile)
  const {
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
  } = useVendorMenuItems()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<MenuPost | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return categories
      .map(([category, items]) => {
        const filteredItems = items.filter((item) => {
          const matchesCategory = !activeCategory || category === activeCategory
          const matchesSearch =
            !query ||
            item.title.toLowerCase().includes(query) ||
            item.description?.toLowerCase().includes(query) ||
            item.category?.toLowerCase().includes(query)
          return matchesCategory && matchesSearch
        })
        return [category, filteredItems] as const
      })
      .filter(([, items]) => items.length > 0)
  }, [categories, activeCategory, searchQuery])

  const categoryNames = useMemo(() => categories.map(([name]) => name), [categories])

  const handleEdit = (item: MenuPost) => {
    setSelectedItem(item)
    setSheetOpen(true)
  }

  const handleToggleAvailability = async (item: MenuPost, available: boolean) => {
    if (!vendorId) return

    const result = await MenuService.toggleAvailability(item.id, vendorId, available)
    if (!result.success) {
      toast.error(result.error || 'Failed to update availability')
      return
    }

    updateItemInList({ ...item, is_available: available })
    toast.success(available ? 'Item is now available' : 'Item hidden from menu')
  }

  const handleOpenCreate = () => {
    if (!profile?.username) {
      toast.error('Your restaurant profile needs a username before creating menu items')
      return
    }
    setCreateOpen(true)
  }

  return (
    <div className="space-y-6">

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{stats.total} items</Badge>
          <Badge className="bg-success/15 text-success border-success/30">
            {stats.available} available
          </Badge>
          {stats.unavailable > 0 && (
            <Badge variant="outline">{stats.unavailable} hidden</Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4" />
            Add item
          </Button>
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={refreshing}>
            <RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search menu items"
          className="pl-10"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveCategory(null)}
          className={
            activeCategory === null
              ? 'shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground'
              : 'shrink-0 rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground'
          }
        >
          All
        </button>
        {categoryNames.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={
              activeCategory === category
                ? 'shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground'
                : 'shrink-0 rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground'
            }
          >
            {category}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
          Loading menu…
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : filteredCategories.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 p-8 text-center">
            <UtensilsCrossed className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium text-foreground">No menu items found</p>
            <p className="text-sm text-muted-foreground">
              Create your first item here — it syncs to POS, mobile app, storefront, and discovery
              website automatically.
            </p>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" />
              Create menu item
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {filteredCategories.map(([category, items]) => (
            <section key={category} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">{category}</h2>
                <span className="text-sm text-muted-foreground">{items.length} items</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    onEdit={handleEdit}
                    onToggleAvailability={handleToggleAvailability}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <MenuItemSheet
        item={selectedItem}
        vendorId={vendorId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onUpdated={updateItemInList}
        onRemoved={removeItemFromList}
      />

      <CreateMenuItemSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        vendorId={vendorId}
        username={profile?.username}
        categorySuggestions={categoryNames}
        onCreated={addItemToList}
      />
    </div>
  )
}
