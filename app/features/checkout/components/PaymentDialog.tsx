import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { useAuthStore } from '@/app/stores/authStore'
import { formatCurrency, parseKeypadAmount } from '@/lib/checkout/format'
import { createPosOrderFromCart } from '@/lib/checkout/posCheckoutService'
import type { PaymentMethod } from '@/lib/checkout/types'
import { cn } from '@/lib/utils'

import { useCheckoutStore } from '../checkoutStore'
import { Keypad } from './Keypad'

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'wallet', label: 'Wallet' },
]

type PaymentDialogProps = {
  open: boolean
  onClose: () => void
}

export function PaymentDialog({ open, onClose }: PaymentDialogProps) {
  const profile = useAuthStore((s) => s.profile)
  const total = useCheckoutStore((s) => s.getTotal())
  const cashTendered = useCheckoutStore((s) => s.cashTendered)
  const setCashTendered = useCheckoutStore((s) => s.setCashTendered)
  const isSubmitting = useCheckoutStore((s) => s.isSubmitting)
  const beginSaleSubmit = useCheckoutStore((s) => s.beginSaleSubmit)
  const finishSaleSubmit = useCheckoutStore((s) => s.finishSaleSubmit)
  const resetSale = useCheckoutStore((s) => s.resetSale)
  const dineInReady = useCheckoutStore((s) => s.dineInReady)

  const [method, setMethod] = useState<PaymentMethod>('cash')
  const inFlight = useRef(false)

  const tenderedAmount = parseKeypadAmount(cashTendered)
  const changeDue = useMemo(() => Math.max(0, tenderedAmount - total), [tenderedAmount, total])
  const needsCashTender = method === 'cash'
  const canComplete =
    total > 0 &&
    !isSubmitting &&
    (!needsCashTender || tenderedAmount >= total) &&
    dineInReady()

  if (!open) return null

  const handleComplete = async () => {
    if (!profile?.id || inFlight.current || isSubmitting) return
    if (!dineInReady()) {
      toast.error('Select a table for dine-in orders')
      return
    }
    if (total <= 0) return
    if (needsCashTender && tenderedAmount < total) {
      toast.error('Cash tendered is less than the amount due')
      return
    }

    inFlight.current = true
    const snapshot = beginSaleSubmit()
    if (!snapshot) {
      inFlight.current = false
      toast.error('Unable to start payment')
      return
    }

    try {
      const result = await createPosOrderFromCart({
        vendorId: profile.id,
        buyerId: profile.id,
        orderType: snapshot.orderType,
        paymentMethod: method,
        lineItems: snapshot.lineItems,
        subtotal: snapshot.subtotal,
        total: snapshot.total,
        totalQuantity: snapshot.itemCount,
        customerName: snapshot.customerName,
        customerId: snapshot.customerId,
        tableId: snapshot.tableId,
        discount: snapshot.discount,
      })

      if (!result.success || !result.orderId) {
        finishSaleSubmit()
        toast.error(result.error || 'Failed to complete sale')
        return
      }

      resetSale()
      onClose()
      toast.success('Sale completed', {
        description: `Order recorded (#${result.orderId.slice(0, 8)})`,
      })
    } catch {
      finishSaleSubmit()
      toast.error('Something went wrong while completing the sale')
    } finally {
      inFlight.current = false
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[20px] border border-border bg-card shadow-xl">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-xl font-bold">Take payment</h3>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <p className="text-3xl font-bold">{formatCurrency(total)}</p>
          <p className="text-sm text-muted-foreground">Choose how the customer is paying.</p>

          <div className="grid grid-cols-2 gap-2">
            {METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setMethod(m.value)
                  if (m.value !== 'cash') setCashTendered(String(Math.round(total)))
                }}
                className={cn(
                  'rounded-2xl border px-4 py-4 text-base font-bold transition',
                  method === m.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-muted text-foreground hover:bg-muted/80',
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          {needsCashTender && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-border bg-muted/50 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Cash tendered</p>
                <p className="mt-1 text-2xl font-semibold">
                  {cashTendered ? formatCurrency(tenderedAmount) : '—'}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Change: {formatCurrency(changeDue)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
                  onClick={() => setCashTendered(String(Math.round(total)))}
                >
                  Exact
                </button>
              </div>
              <Keypad value={cashTendered} onChange={setCashTendered} />
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-border p-4">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              if (!isSubmitting) onClose()
            }}
            className="flex-1 rounded-full py-3 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canComplete}
            onClick={() => void handleComplete()}
            className={cn(
              'flex-[1.4] rounded-full py-3 text-sm font-bold transition',
              canComplete
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'cursor-not-allowed bg-muted text-muted-foreground',
            )}
          >
            {isSubmitting ? 'Processing…' : 'Complete payment'}
          </button>
        </div>
      </div>
    </div>
  )
}
