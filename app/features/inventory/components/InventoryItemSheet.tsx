import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/app/components/ui/button'
import {
  FormField,
  FormSheetBody,
  FormSheetFooter,
  FormSheetScroll,
  formSelectClassName,
} from '@/app/components/ui/form-sheet'
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
import {
  INVENTORY_UNITS,
  ITEM_TYPE_LABELS,
  LEVEL_VALUE_LABELS,
  TRACKING_METHOD_LABELS,
  type InventoryItem,
  type InventoryItemType,
  type InventoryLevelValue,
  type InventoryTrackingMethod,
} from '@/lib/types/inventory'

type InventoryItemSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendorId?: string
  item: InventoryItem | null
  onSaved: () => void
}

export function InventoryItemSheet({
  open,
  onOpenChange,
  vendorId,
  item,
  onSaved,
}: InventoryItemSheetProps) {
  const isEdit = Boolean(item)

  const [name, setName] = useState('')
  const [unit, setUnit] = useState<string>('pcs')
  const [itemType, setItemType] = useState<InventoryItemType>('ingredient')
  const [reorderLevel, setReorderLevel] = useState('')
  const [costPerUnit, setCostPerUnit] = useState('')
  const [openingQuantity, setOpeningQuantity] = useState('')
  const [trackingMethod, setTrackingMethod] = useState<InventoryTrackingMethod>('quantity')
  const [levelValue, setLevelValue] = useState<InventoryLevelValue>('medium')
  const [linkedPostId, setLinkedPostId] = useState<string>('')
  const [menuOptions, setMenuOptions] = useState<{ id: string; title: string }[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return

    if (item) {
      setName(item.name)
      setUnit(item.unit)
      setItemType(item.item_type)
      setReorderLevel(String(item.reorder_level))
      setCostPerUnit(String(item.cost_per_unit))
      setOpeningQuantity('')
      setTrackingMethod(item.tracking_method ?? 'quantity')
      setLevelValue(item.level_value ?? 'medium')
      setLinkedPostId(item.linked_post_id ?? '')
    } else {
      setName('')
      setUnit('pcs')
      setItemType('ingredient')
      setReorderLevel('')
      setCostPerUnit('')
      setOpeningQuantity('')
      setTrackingMethod('quantity')
      setLevelValue('medium')
      setLinkedPostId('')
    }
  }, [open, item])

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

  const handleSave = async () => {
    if (!vendorId) return
    if (!name.trim()) {
      toast.error('Item name is required')
      return
    }

    setLoading(true)
    try {
      const result = await InventoryService.upsertItem({
        id: item?.id,
        vendorId,
        name,
        unit,
        itemType,
        reorderLevel: Number.parseFloat(reorderLevel) || 0,
        costPerUnit: Number.parseFloat(costPerUnit) || 0,
        openingQuantity: Number.parseFloat(openingQuantity) || 0,
        linkedPostId: linkedPostId || null,
        tracking_method: trackingMethod,
        level_value: trackingMethod === 'level' ? levelValue : null,
      })

      if (result.error || !result.data) {
        toast.error(result.error || 'Failed to save item')
        return
      }

      toast.success(isEdit ? 'Item updated' : 'Item added')
      onSaved()
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit item' : 'New inventory item'}</SheetTitle>
          <SheetDescription>
            Kitchen ledger item. Linking a finished product updates menu sellable stock from this
            ledger — menu stock is not a separate inventory authority.
          </SheetDescription>
        </SheetHeader>

        <FormSheetBody>
          <FormSheetScroll>
            <FormField label="Name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jollof rice base"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Unit">
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className={formSelectClassName}
                >
                  {INVENTORY_UNITS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Item type">
                <select
                  value={itemType}
                  onChange={(e) => setItemType(e.target.value as InventoryItemType)}
                  className={formSelectClassName}
                >
                  {(Object.keys(ITEM_TYPE_LABELS) as InventoryItemType[]).map((type) => (
                    <option key={type} value={type}>
                      {ITEM_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField label="Tracking method">
              <select
                value={trackingMethod}
                onChange={(e) => setTrackingMethod(e.target.value as InventoryTrackingMethod)}
                className={formSelectClassName}
              >
                {(Object.keys(TRACKING_METHOD_LABELS) as InventoryTrackingMethod[]).map(
                  (method) => (
                    <option key={method} value={method}>
                      {TRACKING_METHOD_LABELS[method]}
                    </option>
                  ),
                )}
              </select>
            </FormField>

            {trackingMethod === 'level' && (
              <FormField label="Current level">
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setLevelValue(level)}
                      className={
                        levelValue === level
                          ? 'rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground'
                          : 'rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground hover:bg-accent'
                      }
                    >
                      {LEVEL_VALUE_LABELS[level]}
                    </button>
                  ))}
                </div>
              </FormField>
            )}

            {!isEdit && trackingMethod !== 'level' && (
              <FormField label={`Opening quantity (${unit})`}>
                <Input
                  value={openingQuantity}
                  onChange={(e) => setOpeningQuantity(e.target.value)}
                  inputMode="decimal"
                  placeholder="Supports fractions e.g. 0.5"
                />
              </FormField>
            )}

            {!isEdit && trackingMethod === 'level' && (
              <p className="text-xs text-muted-foreground">
                Opening level is saved on the item; use Stock Count later to change observed level.
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Reorder level">
                <Input
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value)}
                  inputMode="decimal"
                />
              </FormField>
              <FormField label="Cost per unit (₦)">
                <Input
                  value={costPerUnit}
                  onChange={(e) => setCostPerUnit(e.target.value)}
                  inputMode="decimal"
                />
              </FormField>
            </div>

            <FormField
              label="Link to menu item (sellable cache)"
              hint="Menu stock ≠ kitchen inventory. Linked items sync sellable count from this ledger."
            >
              <select
                value={linkedPostId}
                onChange={(e) => setLinkedPostId(e.target.value)}
                className={formSelectClassName}
              >
                <option value="">Not linked</option>
                {menuOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.title}
                  </option>
                ))}
              </select>
            </FormField>
          </FormSheetScroll>

          <FormSheetFooter>
            <Button
              className="w-full rounded-full"
              disabled={loading}
              onClick={() => void handleSave()}
            >
              {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Add item'}
            </Button>
          </FormSheetFooter>
        </FormSheetBody>
      </SheetContent>
    </Sheet>
  )
}
