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
import { InventoryService } from '@/lib/services/inventoryService'
import {
  MOVEMENT_TYPE_LABELS,
  type InventoryItem,
  type InventoryMovementType,
} from '@/lib/types/inventory'

const OUT_MOVEMENT_TYPES: InventoryMovementType[] = ['waste', 'spoilage', 'sale']
const IN_MOVEMENT_TYPES: InventoryMovementType[] = ['purchase', 'return', 'production', 'adjustment']

type RecordMovementSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: InventoryItem | null
  onRecorded: () => void
}

export function RecordMovementSheet({
  open,
  onOpenChange,
  item,
  onRecorded,
}: RecordMovementSheetProps) {
  const [movementType, setMovementType] = useState<InventoryMovementType>('purchase')
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setMovementType('purchase')
    setQuantity('')
    setNotes('')
    setUnitCost(item?.cost_per_unit ? String(item.cost_per_unit) : '')
  }, [open, item])

  if (!item) return null

  const direction = OUT_MOVEMENT_TYPES.includes(movementType) ? 'out' : 'in'

  const handleSubmit = async () => {
    const qty = Number.parseFloat(quantity)
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error('Enter a valid quantity')
      return
    }

    setLoading(true)
    try {
      const result = await InventoryService.recordMovement({
        itemId: item.id,
        movementType,
        quantity: qty,
        direction,
        notes: notes.trim() || undefined,
        unitCost:
          movementType === 'purchase' && Number.isFinite(Number.parseFloat(unitCost))
            ? Number.parseFloat(unitCost)
            : null,
      })

      if (!result.success) {
        toast.error(result.error || 'Failed to record movement')
        return
      }

      toast.success('Stock movement recorded')
      onRecorded()
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Record movement</SheetTitle>
          <SheetDescription>
            {item.name} · {item.quantity_on_hand} {item.unit} on hand
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4 px-1">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Stock in
            </p>
            <div className="grid grid-cols-2 gap-2">
              {IN_MOVEMENT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMovementType(type)}
                  className={
                    movementType === type
                      ? 'rounded-xl bg-primary px-3 py-2 text-left text-sm font-semibold text-primary-foreground'
                      : 'rounded-xl border border-border px-3 py-2 text-left text-sm hover:bg-accent'
                  }
                >
                  {MOVEMENT_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Stock out
            </p>
            <div className="grid grid-cols-2 gap-2">
              {OUT_MOVEMENT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMovementType(type)}
                  className={
                    movementType === type
                      ? 'rounded-xl bg-primary px-3 py-2 text-left text-sm font-semibold text-primary-foreground'
                      : 'rounded-xl border border-border px-3 py-2 text-left text-sm hover:bg-accent'
                  }
                >
                  {MOVEMENT_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Quantity ({item.unit})
            </label>
            <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="decimal" />
          </div>

          {movementType === 'purchase' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Unit cost (₦)
              </label>
              <Input
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                inputMode="decimal"
                placeholder="Optional purchase cost"
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Batch number, reason for waste, supplier, etc."
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            />
          </div>

          <Button className="w-full" disabled={loading} onClick={() => void handleSubmit()}>
            {loading ? 'Saving…' : `Record ${direction === 'in' ? 'stock in' : 'stock out'}`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
