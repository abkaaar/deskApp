import { useState } from 'react'
import { ChefHat, Plus, RefreshCw, Warehouse } from 'lucide-react'

import { Button } from '@/app/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { MOVEMENT_TYPE_LABELS, type InventoryItem, type InventoryRecipe } from '@/lib/types/inventory'

import { InventoryAnalyticsCards } from './components/InventoryAnalyticsCards'
import { InventoryItemCard } from './components/InventoryItemCard'
import { InventoryItemSheet } from './components/InventoryItemSheet'
import { InventorySettingsCard } from './components/InventorySettingsCard'
import { RecipeEditorSheet } from './components/RecipeEditorSheet'
import { RecordMovementSheet } from './components/RecordMovementSheet'
import { StockCountSheet } from './components/StockCountSheet'
import { useVendorInventory } from './hooks/useVendorInventory'

export function InventoryPage() {
  const {
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
  } = useVendorInventory()

  const [itemSheetOpen, setItemSheetOpen] = useState(false)
  const [movementSheetOpen, setMovementSheetOpen] = useState(false)
  const [stockCountSheetOpen, setStockCountSheetOpen] = useState(false)
  const [recipeSheetOpen, setRecipeSheetOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [selectedRecipe, setSelectedRecipe] = useState<InventoryRecipe | null>(null)

  const handleEdit = (item: InventoryItem) => {
    setSelectedItem(item)
    setItemSheetOpen(true)
  }

  const handleRecordMovement = (item: InventoryItem) => {
    setSelectedItem(item)
    setMovementSheetOpen(true)
  }

  const handleStockCount = (item: InventoryItem) => {
    setSelectedItem(item)
    setStockCountSheetOpen(true)
  }

  const handleAddItem = () => {
    setSelectedItem(null)
    setItemSheetOpen(true)
  }

  const handleAddRecipe = () => {
    setSelectedRecipe(null)
    setRecipeSheetOpen(true)
  }

  const handleEditRecipe = (recipe: InventoryRecipe) => {
    setSelectedRecipe(recipe)
    setRecipeSheetOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Warehouse className="h-6 w-6" />
            Inventory
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kitchen ledger, stock counts, and menu-linked sellable cache.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => void refresh()}
            className="gap-2 rounded-full"
          >
            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            Refresh
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleAddRecipe}
            className="gap-2 rounded-full"
          >
            <ChefHat className="h-4 w-4" />
            Recipe
          </Button>
          <Button type="button" onClick={handleAddItem} className="gap-2 rounded-full">
            <Plus className="h-4 w-4" />
            Add item
          </Button>
        </div>
      </div>

      <InventoryAnalyticsCards analytics={analytics} loading={loading} />
      <InventorySettingsCard vendorId={vendorId} settings={settings} onUpdated={setSettings} />

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {alerts.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          {alerts.length} open stock alert{alerts.length === 1 ? '' : 's'} — review low or out items.
        </div>
      )}

      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading inventory…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-10 text-center">
          <p className="text-sm font-medium text-foreground">No inventory items yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add ingredients, finished products, or supplies to start tracking stock.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <InventoryItemCard
              key={item.id}
              item={item}
              onEdit={handleEdit}
              onRecordMovement={handleRecordMovement}
              onStockCount={handleStockCount}
            />
          ))}
        </div>
      )}

      {recipes.length > 0 && (
        <div className="rounded-2xl border border-border bg-card px-4 py-3">
          <h2 className="text-base font-semibold text-foreground">Recipes (Advanced BOM)</h2>
          <ul className="mt-2 space-y-2">
            {recipes.map((recipe) => (
              <li key={recipe.id} className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">{recipe.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {recipe.post_title ?? 'Menu item'} · {recipe.lines.length} ingredient
                    {recipe.lines.length === 1 ? '' : 's'} · yield {recipe.yield_portions}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditRecipe(recipe)}
                >
                  Edit
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {movements.length > 0 && (
        <div className="rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-base font-semibold text-foreground">Recent movements</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Order / ref</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell>{movement.item_name ?? 'Item'}</TableCell>
                  <TableCell>
                    {MOVEMENT_TYPE_LABELS[movement.movement_type] ?? movement.movement_type}
                  </TableCell>
                  <TableCell>
                    {movement.direction === 'out' ? '−' : '+'}
                    {movement.quantity}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {movement.reference_id
                      ? `${movement.reference_type || 'ref'} #${String(movement.reference_id).slice(0, 8)}`
                      : movement.notes?.slice(0, 40) || '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {movement.created_by
                      ? String(movement.created_by).slice(0, 8)
                      : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(movement.created_at).toLocaleString('en-NG', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <InventoryItemSheet
        open={itemSheetOpen}
        onOpenChange={setItemSheetOpen}
        vendorId={vendorId}
        item={selectedItem}
        onSaved={() => void refresh()}
      />

      <RecordMovementSheet
        open={movementSheetOpen}
        onOpenChange={setMovementSheetOpen}
        item={selectedItem}
        onRecorded={() => void refresh()}
      />

      <StockCountSheet
        open={stockCountSheetOpen}
        onOpenChange={setStockCountSheetOpen}
        item={selectedItem}
        onCounted={() => void refresh()}
      />

      <RecipeEditorSheet
        open={recipeSheetOpen}
        onOpenChange={setRecipeSheetOpen}
        vendorId={vendorId}
        items={items}
        recipe={selectedRecipe}
        onSaved={() => void refresh()}
      />
    </div>
  )
}
