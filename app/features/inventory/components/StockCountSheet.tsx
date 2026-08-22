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
  LEVEL_VALUE_LABELS,
  type InventoryItem,
  type InventoryLevelValue,
} from '@/lib/types/inventory'

type StockCountSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: InventoryItem | null
  onCounted: () => void
}

export function StockCountSheet({
  open,
  onOpenChange,
  item,
  onCounted,
}: StockCountSheetProps) {
  const [countedQty, setCountedQty] = useState('')
  const [levelValue, setLevelValue] = useState<InventoryLevelValue>('medium')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !item) return
    setCountedQty(String(item.quantity_on_hand))
    setLevelValue(item.level_value ?? 'medium')
    setNotes('')
  }, [open, item])

  const handleApply = async () => {
    if (!item) return
    const qty = Number.parseFloat(countedQty)
    if (Number.isNaN(qty) || qty < 0) {
      toast.error('Enter a valid counted quantity (0 or more)')
      return
    }

    setLoading(true)
    try {
      const result = await InventoryService.applyStockCount({
        itemId: item.id,
        countedQuantity: qty,
        notes: notes.trim() || undefined,
        levelValue: item.tracking_method === 'level' ? levelValue : null,
      })
      if (!result.success) {
        toast.error(result.error || 'Failed to apply stock count')
        return
      }
      toast.success('Stock count recorded')
      onCounted()
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Physical stock count</SheetTitle>
          <SheetDescription>
            Enter what you actually have. The ledger writes a stock-count movement for any
            difference from on-hand ({item?.quantity_on_hand ?? 0} {item?.unit ?? ''}).
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4 px-1">
          <p className="text-sm font-medium text-foreground">{item?.name}</p>

          {item?.tracking_method === 'level' ? (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Observed level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'medium', 'high'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => {
                      setLevelValue(level)
                      setCountedQty(level === 'low' ? '1' : level === 'medium' ? '2' : '3')
                    }}
                    className={
                      levelValue === level
                        ? 'rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground'
                        : 'rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground hover:bg-accent'
                    }
                  >
                    {LEVEL_VALUE_LABELS[level]}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Counted quantity ({item?.unit})
              </label>
              <Input
                value={countedQty}
                onChange={(e) => setCountedQty(e.target.value)}
                inputMode="decimal"
                placeholder="e.g. 12.5"
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
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              placeholder="Optional count notes"
            />
          </div>

          <Button className="w-full" disabled={loading} onClick={() => void handleApply()}>
            {loading ? 'Saving…' : 'Apply stock count'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
