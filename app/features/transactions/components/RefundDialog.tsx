import { useEffect, useState } from 'react'

import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet'
import type { RefundStockOutcome } from '@/lib/checkout/refundReceipt'
import { cn } from '@/lib/utils'

const OUTCOMES: { value: RefundStockOutcome; label: string; hint: string }[] = [
  {
    value: 'returned_sellable',
    label: 'Returned sellable',
    hint: 'Restore stock to sell again',
  },
  {
    value: 'not_returned',
    label: 'Not returned',
    hint: 'Customer kept the items',
  },
  {
    value: 'damaged',
    label: 'Damaged / unsellable',
    hint: 'Do not restore stock',
  },
]

type RefundDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  busy?: boolean
  orderLabel: string
  amountLabel: string
  onConfirm: (input: { stockOutcome: RefundStockOutcome; reason: string }) => void
}

export function RefundDialog({
  open,
  onOpenChange,
  busy = false,
  orderLabel,
  amountLabel,
  onConfirm,
}: RefundDialogProps) {
  const [stockOutcome, setStockOutcome] = useState<RefundStockOutcome>('returned_sellable')
  const [reason, setReason] = useState('')
  const [approved, setApproved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setStockOutcome('returned_sellable')
    setReason('')
    setApproved(false)
    setError(null)
  }, [open])

  const submit = () => {
    const trimmed = reason.trim()
    if (!approved) {
      setError('Manager / owner approval is required')
      return
    }
    if (!trimmed) {
      setError('Enter a refund reason for audit')
      return
    }
    onConfirm({ stockOutcome, reason: trimmed })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Refund sale</SheetTitle>
          <SheetDescription>
            {orderLabel} · {amountLabel}. Payment becomes Refunded; fulfillment status is kept.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5 px-1">
          <label className="flex items-start gap-3 rounded-xl border border-border p-3">
            <input
              type="checkbox"
              checked={approved}
              onChange={(e) => setApproved(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm text-foreground">
              Manager / owner approved this refund
            </span>
          </label>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Return condition
            </p>
            <div className="space-y-2">
              {OUTCOMES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStockOutcome(opt.value)}
                  className={cn(
                    'w-full rounded-xl border px-3 py-2.5 text-left',
                    stockOutcome === opt.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card',
                  )}
                >
                  <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.hint}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Reason (required)
            </p>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Wrong item, customer request"
            />
          </div>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1"
              disabled={busy}
              onClick={submit}
            >
              {busy ? 'Refunding…' : 'Confirm refund'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
