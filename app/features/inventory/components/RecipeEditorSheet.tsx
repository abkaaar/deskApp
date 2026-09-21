import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
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
import { InventoryService } from '@/lib/services/inventoryService'
import { MenuService } from '@/lib/services/menuService'
import type { InventoryItem, InventoryRecipe } from '@/lib/types/inventory'

type LineDraft = {
  key: string
  inventoryItemId: string
  quantity: string
  unit: string
}

type RecipeEditorSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendorId?: string
  items: InventoryItem[]
  recipe: InventoryRecipe | null
  onSaved: () => void
}

function convertHint(fromUnit: string, toUnit: string, qty: number): string | null {
  const f = fromUnit.toLowerCase()
  const t = toUnit.toLowerCase()
  if (f === 'g' && t === 'kg') return `= ${(qty / 1000).toFixed(3)} kg`
  if (f === 'kg' && t === 'g') return `= ${(qty * 1000).toFixed(0)} g`
  if (f === 'ml' && t === 'l') return `= ${(qty / 1000).toFixed(3)} l`
  if (f === 'l' && t === 'ml') return `= ${(qty * 1000).toFixed(0)} ml`
  return null
}

export function RecipeEditorSheet({
  open,
  onOpenChange,
  vendorId,
  items,
  recipe,
  onSaved,
}: RecipeEditorSheetProps) {
  const [name, setName] = useState('Recipe')
  const [postId, setPostId] = useState('')
  const [yieldPortions, setYieldPortions] = useState('1')
  const [lines, setLines] = useState<LineDraft[]>([])
  const [menuOptions, setMenuOptions] = useState<{ id: string; title: string }[]>([])
  const [loading, setLoading] = useState(false)

  const ingredients = items.filter((i) => i.item_type === 'ingredient' || i.item_type === 'packaging')

  useEffect(() => {
    if (!open) return
    if (recipe) {
      setName(recipe.name)
      setPostId(recipe.post_id)
      setYieldPortions(String(recipe.yield_portions))
      setLines(
        recipe.lines.map((line, idx) => ({
          key: `${line.id}-${idx}`,
          inventoryItemId: line.inventory_item_id,
          quantity: String(line.quantity),
          unit: line.unit,
        })),
      )
    } else {
      setName('Recipe')
      setPostId('')
      setYieldPortions('1')
      setLines([])
    }
  }, [open, recipe])

  useEffect(() => {
    if (!open || !vendorId) return
    let cancelled = false
    void MenuService.getVendorMenu(vendorId).then((result) => {
      if (cancelled) return
      setMenuOptions(result.data.map((post) => ({ id: post.id, title: post.title })))
    })
    return () => {
      cancelled = true
    }
  }, [open, vendorId])

  const addLine = () => {
    const first = ingredients[0]
    setLines((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}`,
        inventoryItemId: first?.id ?? '',
        quantity: '0.25',
        unit: first?.unit ?? 'kg',
      },
    ])
  }

  const handleSave = async () => {
    if (!vendorId) return
    if (!postId) {
      toast.error('Pick a menu item for this recipe')
      return
    }
    const yieldQty = Number.parseFloat(yieldPortions)
    if (!Number.isFinite(yieldQty) || yieldQty <= 0) {
      toast.error('Yield must be greater than 0')
      return
    }
    const parsedLines = lines
      .map((line) => ({
        inventoryItemId: line.inventoryItemId,
        quantity: Number.parseFloat(line.quantity),
        unit: line.unit.trim() || 'kg',
      }))
      .filter((line) => line.inventoryItemId && Number.isFinite(line.quantity) && line.quantity > 0)

    if (parsedLines.length === 0) {
      toast.error('Add at least one ingredient line')
      return
    }

    setLoading(true)
    try {
      const result = await InventoryService.upsertRecipe({
        id: recipe?.id,
        vendorId,
        postId,
        name: name.trim() || 'Recipe',
        yieldPortions: yieldQty,
        lines: parsedLines,
      })
      if (!result.success) {
        toast.error(result.error || 'Failed to save recipe')
        return
      }
      toast.success(recipe ? 'Recipe updated' : 'Recipe created')
      onSaved()
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{recipe ? 'Edit recipe' : 'New recipe (Advanced)'}</SheetTitle>
          <SheetDescription>
            Link a menu item to ingredient quantities. POS sales explode this BOM into ledger
            movements (opt-in Advanced tracking).
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4 px-1">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Recipe name
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jollof plate" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Menu item
            </label>
            <select
              value={postId}
              onChange={(e) => setPostId(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            >
              <option value="">Select menu item…</option>
              {menuOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Yield (portions per batch)
            </label>
            <Input
              value={yieldPortions}
              onChange={(e) => setYieldPortions(e.target.value)}
              inputMode="decimal"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Ingredient lines
              </p>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>

            {lines.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Example: chicken 0.25 kg per plate (yield 1).
              </p>
            )}

            {lines.map((line) => {
              const qty = Number.parseFloat(line.quantity)
              const item = ingredients.find((i) => i.id === line.inventoryItemId)
              const hint =
                Number.isFinite(qty) && item
                  ? convertHint(line.unit, item.unit, qty)
                  : null
              return (
                <div key={line.key} className="space-y-2 rounded-xl border border-border p-3">
                  <select
                    value={line.inventoryItemId}
                    onChange={(e) => {
                      const next = ingredients.find((i) => i.id === e.target.value)
                      setLines((prev) =>
                        prev.map((l) =>
                          l.key === line.key
                            ? {
                                ...l,
                                inventoryItemId: e.target.value,
                                unit: next?.unit ?? l.unit,
                              }
                            : l,
                        ),
                      )
                    }}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  >
                    <option value="">Ingredient…</option>
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} ({ing.unit})
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <Input
                      value={line.quantity}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l) =>
                            l.key === line.key ? { ...l, quantity: e.target.value } : l,
                          ),
                        )
                      }
                      inputMode="decimal"
                      placeholder="Qty"
                    />
                    <Input
                      value={line.unit}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l) =>
                            l.key === line.key ? { ...l, unit: e.target.value } : l,
                          ),
                        )
                      }
                      placeholder="Unit"
                      className="w-24"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
                </div>
              )
            })}
          </div>

          <Button className="w-full" disabled={loading} onClick={() => void handleSave()}>
            {loading ? 'Saving…' : 'Save recipe'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
