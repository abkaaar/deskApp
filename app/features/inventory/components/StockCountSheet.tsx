import { useEffect, useMemo, useState } from 'react'
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
  type InventoryVariance,
} from '@/lib/types/inventory'
import { useAuthStore } from '@/app/stores/authStore'

type StockCountSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: InventoryItem | null
  onCounted: () => void
}

function formatNaira(amount: number) {
  return `₦${Math.round(Math.abs(amount)).toLocaleString('en-NG')}`
}

export function StockCountSheet({
  open,
  onOpenChange,
  item,
  onCounted,
}: StockCountSheetProps) {
  const vendorId = useAuthStore((s) => s.profile?.id)
  const [countedQty, setCountedQty] = useState('')
  const [levelValue, setLevelValue] = useState<InventoryLevelValue>('medium')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [periodVariance, setPeriodVariance] = useState<InventoryVariance | null>(null)

  useEffect(() => {
    if (!open || !item) return
    setCountedQty(String(item.quantity_on_hand))
    setLevelValue(item.level_value ?? 'medium')
    setNotes('')
    setPeriodVariance(null)
    if (vendorId) {
      void InventoryService.getVariance(vendorId, item.id).then((res) => {
        if (res.data) setPeriodVariance(res.data)
      })
    }
  }, [open, item, vendorId])

  const countVariance = useMemo(() => {
    if (!item) return null
    const counted = Number.parseFloat(countedQty)
    if (!Number.isFinite(counted)) return null
    const qtyDelta = counted - item.quantity_on_hand
    return {
      qtyDelta,
      value: qtyDelta * (item.cost_per_unit || 0),
    }
  }, [countedQty, item])

  const handleApply = async () => {
    if (!item) return
    const qty = Number.parseFloat(countedQty)
    if (Number.isNaN(qty) || qty < 0) {
      toast.error('Enter a valid counted quantity (0 or more)')
      return
    }

    setLoading(true)
    try {
      const varianceNote =
        countVariance && Math.abs(countVariance.qtyDelta) > 0.0001
          ? `Variance ${countVariance.qtyDelta >= 0 ? '+' : ''}${countVariance.qtyDelta.toFixed(3)} ${item.unit} (${formatNaira(countVariance.value)})`
          : undefined
      const result = await InventoryService.applyStockCount({
        itemId: item.id,
        countedQuantity: qty,
        notes: [notes.trim(), varianceNote].filter(Boolean).join(' · ') || undefined,
        levelValue: item.tracking_method === 'level' ? levelValue : null,
      })
      if (!result.success) {
        toast.error(result.error || 'Failed to apply stock count')
        return
      }
      toast.success('Stock count recorded — variance approved on ledger')
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
            Enter what you actually have. Approving writes a stock-count movement (expected vs
            counted → variance).
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4 px-1">
          <p className="text-sm font-medium text-foreground">{item?.name}</p>
          <p className="text-xs text-muted-foreground">
            System on hand: {item?.quantity_on_hand ?? 0} {item?.unit ?? ''}
          </p>

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

          {countVariance && Math.abs(countVariance.qtyDelta) > 0.0001 && (
            <div className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
              Count variance:{' '}
              <strong>
                {countVariance.qtyDelta >= 0 ? '+' : ''}
                {countVariance.qtyDelta.toFixed(3)} {item?.unit}
              </strong>{' '}
              ≈ {formatNaira(countVariance.value)}
            </div>
          )}

          {periodVariance && (
            <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Period expected usage: {periodVariance.expected_usage.toFixed(2)} {periodVariance.unit}
              {' · '}ledger out: {periodVariance.ledger_usage.toFixed(2)}
              {' · '}suggest reorder:{' '}
              {periodVariance.suggested_reorder > 0
                ? `${periodVariance.suggested_reorder.toFixed(1)} ${periodVariance.unit}`
                : 'none'}
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
            {loading ? 'Saving…' : 'Approve count & variance'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
