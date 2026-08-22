import { useMemo } from 'react'
import { toast } from 'sonner'

import { useAuthStore } from '@/app/stores/authStore'
import { formatCurrency, parseKeypadAmount } from '@/lib/checkout/format'
import { createPosOrderFromCart } from '@/lib/checkout/posCheckoutService'
import { cn } from '@/lib/utils'

import { useCheckoutStore } from '../checkoutStore'
import { Keypad } from './Keypad'

export function CashPaymentPanel() {
  const profile = useAuthStore((s) => s.profile)
  const cart = useCheckoutStore((s) => s.cart)
  const orderType = useCheckoutStore((s) => s.orderType)
  const cashTendered = useCheckoutStore((s) => s.cashTendered)
  const isSubmitting = useCheckoutStore((s) => s.isSubmitting)
  const setCashTendered = useCheckoutStore((s) => s.setCashTendered)
  const setIsSubmitting = useCheckoutStore((s) => s.setIsSubmitting)
  const getTotal = useCheckoutStore((s) => s.getTotal)
  const getItemCount = useCheckoutStore((s) => s.getItemCount)
  const getLineItemsPayload = useCheckoutStore((s) => s.getLineItemsPayload)
  const resetSale = useCheckoutStore((s) => s.resetSale)

  const total = getTotal()
  const tenderedAmount = parseKeypadAmount(cashTendered)
  const changeDue = useMemo(() => Math.max(0, tenderedAmount - total), [tenderedAmount, total])
  const canComplete = cart.length > 0 && tenderedAmount >= total && total > 0 && !isSubmitting

  const handleComplete = async () => {
    if (!profile?.id || !canComplete) return

    setIsSubmitting(true)
    try {
      const result = await createPosOrderFromCart({
        vendorId: profile.id,
        buyerId: profile.id,
        orderType,
        paymentMethod: 'cash',
        lineItems: getLineItemsPayload(),
        subtotal: total,
        total,
        totalQuantity: getItemCount(),
      })

      if (!result.success) {
        toast.error(result.error || 'Failed to complete sale')
        return
      }

      toast.success('Sale completed', {
        description: `Order recorded${result.orderId ? ` (#${result.orderId.slice(0, 8)})` : ''}`,
      })
      resetSale()
    } catch {
      toast.error('Something went wrong while completing the sale')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="flex min-h-0 flex-col bg-background p-4">
      <div className="mb-4 space-y-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Amount due</p>
          <p className="mt-1 text-3xl font-bold text-foreground">{formatCurrency(total)}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Cash tendered</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {cashTendered ? formatCurrency(tenderedAmount) : '—'}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Change due</p>
          <p
            className={cn(
              'mt-1 text-2xl font-semibold',
              changeDue > 0 ? 'text-success' : 'text-muted-foreground',
            )}
          >
            {cart.length > 0 ? formatCurrency(changeDue) : '—'}
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Keypad value={cashTendered} onChange={setCashTendered} />
      </div>

      <button
        type="button"
        disabled={!canComplete}
        onClick={() => void handleComplete()}
        className={cn(
          'mt-4 h-10 w-full rounded-2xl text-base font-bold transition',
          canComplete
            ? 'bg-success text-success-foreground hover:bg-success/90 active:scale-[0.99]'
            : 'cursor-not-allowed bg-muted text-muted-foreground',
        )}
      >
        {isSubmitting ? 'Processing...' : 'Complete Sale'}
      </button>
    </section>
  )
}
