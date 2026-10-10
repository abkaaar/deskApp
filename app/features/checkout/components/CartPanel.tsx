import { useState } from 'react'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { useAuthStore } from '@/app/stores/authStore'
import { formatCurrency } from '@/lib/checkout/format'
import { holdCurrentSale } from '@/lib/checkout/holdSale'
import { cn } from '@/lib/utils'

import { useCheckoutStore } from '../checkoutStore'

type CartPanelProps = {
  onPay: () => void
}

export function CartPanel({ onPay }: CartPanelProps) {
  const profile = useAuthStore((s) => s.profile)
  const cart = useCheckoutStore((s) => s.cart)
  const orderType = useCheckoutStore((s) => s.orderType)
  const updateQty = useCheckoutStore((s) => s.updateQty)
  const clearCart = useCheckoutStore((s) => s.clearCart)
  const getSubtotal = useCheckoutStore((s) => s.getSubtotal)
  const getDiscount = useCheckoutStore((s) => s.getDiscount)
  const getTotal = useCheckoutStore((s) => s.getTotal)
  const discountNaira = useCheckoutStore((s) => s.discountNaira)
  const setDiscountNaira = useCheckoutStore((s) => s.setDiscountNaira)
  const dineInReady = useCheckoutStore((s) => s.dineInReady)
  const isSubmitting = useCheckoutStore((s) => s.isSubmitting)

  const [discountText, setDiscountText] = useState(
    discountNaira > 0 ? String(discountNaira) : '',
  )

  const subtotal = getSubtotal()
  const discount = getDiscount()
  const total = getTotal()

  const orderTypeLabel =
    orderType === 'dine_in' ? 'Dine in' : orderType === 'takeaway' ? 'Takeaway' : 'Delivery'

  const handleHold = async () => {
    if (!profile?.id || cart.length === 0 || isSubmitting) return
    if (!dineInReady()) {
      toast.error('Select a table for dine-in orders')
      return
    }

    const result = await holdCurrentSale(profile.id)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setDiscountText('')
    toast.success('Cart held', {
      description: 'No order created — resume from Held when ready to pay.',
    })
  }

  return (
    <section className="flex min-h-0 flex-col rounded-[20px] border border-border/60 bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Current order</h2>
          <p className="text-sm text-muted-foreground">{orderTypeLabel}</p>
        </div>
        {cart.length > 0 && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              clearCart()
              setDiscountText('')
            }}
            className="text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            Clear
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
            <p className="font-semibold">Cart is empty</p>
            <p className="mt-1 text-xs text-muted-foreground">Tap menu items to begin.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {cart.map((line) => (
              <li key={line.line_key} className="rounded-xl py-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">{line.title}</p>
                  <p className="text-sm text-muted-foreground">{formatCurrency(line.subtotal)}</p>
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => updateQty(line.line_key, line.quantity - 1)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-50"
                    aria-label="Decrease"
                  >
                    {line.quantity === 1 ? (
                      <Trash2 className="h-4 w-4" />
                    ) : (
                      <Minus className="h-4 w-4" />
                    )}
                  </button>
                  <span className="w-6 text-center text-sm font-bold">{line.quantity}</span>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => updateQty(line.line_key, line.quantity + 1)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-50"
                    aria-label="Increase"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {cart.length > 0 && (
        <div className="space-y-3 border-t border-border px-4 py-4">
          <div className="flex items-center justify-between text-sm">
            <span>Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Discount (₦)</label>
            <input
              type="text"
              inputMode="decimal"
              value={discountText}
              disabled={isSubmitting}
              onChange={(e) => {
                setDiscountText(e.target.value)
                setDiscountNaira(Number.parseFloat(e.target.value) || 0)
              }}
              className="mt-1 h-10 w-full rounded-full border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              placeholder="0"
            />
          </div>
          {discount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span>Discount</span>
              <span className="font-medium">−{formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="font-semibold">Total</span>
            <span className="text-lg font-bold">{formatCurrency(total)}</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void handleHold()}
              className="flex-1 rounded-full border border-border py-3 text-sm font-semibold transition hover:bg-muted disabled:opacity-50"
            >
              {isSubmitting ? 'Holding…' : 'Hold'}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                if (!dineInReady()) {
                  toast.error('Select a table for dine-in orders')
                  return
                }
                onPay()
              }}
              className={cn(
                'flex-[1.4] rounded-full py-3 text-sm font-bold transition',
                'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50',
              )}
            >
              Pay {formatCurrency(total)}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
