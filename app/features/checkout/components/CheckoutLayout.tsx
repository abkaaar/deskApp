import { useEffect, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

import { useAuthStore } from '@/app/stores/authStore'
import { formatCurrency } from '@/lib/checkout/format'
import { createPosOrderFromCart } from '@/lib/checkout/posCheckoutService'
import { cn } from '@/lib/utils'

import { useCheckoutStore, type CheckoutMode } from '../checkoutStore'

import { CartPanel } from './CartPanel'
import { CheckoutContextBar } from './CheckoutContextBar'
import { FavoritesPanel } from './FavoritesPanel'
import { HeldOrdersPanel } from './HeldOrdersPanel'
import { KeypadSalePanel } from './KeypadSalePanel'
import { MenuPanel } from './MenuPanel'
import { PaymentDialog } from './PaymentDialog'
import { ReviewSaleDialog } from './ReviewSaleDialog'

const MODES: { id: CheckoutMode; label: string }[] = [
  { id: 'keypad', label: 'Keypad' },
  { id: 'menu', label: 'Menu' },
  { id: 'favorites', label: 'Favorites' },
]

const SPLIT_MIN = 760

export function CheckoutLayout() {
  const profile = useAuthStore((s) => s.profile)
  const checkoutMode = useCheckoutStore((s) => s.checkoutMode)
  const setCheckoutMode = useCheckoutStore((s) => s.setCheckoutMode)
  const orderType = useCheckoutStore((s) => s.orderType)
  const hydrateFavorites = useCheckoutStore((s) => s.hydrateFavorites)
  const resetSale = useCheckoutStore((s) => s.resetSale)
  const cart = useCheckoutStore((s) => s.cart)
  const getItemCount = useCheckoutStore((s) => s.getItemCount)
  const getTotal = useCheckoutStore((s) => s.getTotal)
  const dineInReady = useCheckoutStore((s) => s.dineInReady)
  const beginSaleSubmit = useCheckoutStore((s) => s.beginSaleSubmit)
  const finishSaleSubmit = useCheckoutStore((s) => s.finishSaleSubmit)
  const isSubmitting = useCheckoutStore((s) => s.isSubmitting)

  const [reviewOpen, setReviewOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [split, setSplit] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= SPLIT_MIN : true,
  )
  const holdInFlight = useRef(false)

  useEffect(() => {
    if (profile?.id) hydrateFavorites(profile.id)
  }, [profile?.id, hydrateFavorites])

  useEffect(() => {
    const onResize = () => setSplit(window.innerWidth >= SPLIT_MIN)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const openReview = () => {
    if (cart.length === 0) return
    if (!dineInReady()) {
      toast.error('Select a table for dine-in orders')
      return
    }
    setReviewOpen(true)
  }

  const handleHold = async () => {
    if (!profile?.id || cart.length === 0 || holdInFlight.current || isSubmitting) return
    if (!dineInReady()) {
      toast.error('Select a table for dine-in orders')
      return
    }
    const snapshot = beginSaleSubmit()
    if (!snapshot) {
      toast.error('Unable to hold order')
      return
    }
    holdInFlight.current = true
    try {
      const result = await createPosOrderFromCart({
        vendorId: profile.id,
        buyerId: profile.id,
        orderType: snapshot.orderType,
        paymentMethod: 'cash',
        lineItems: snapshot.lineItems,
        subtotal: snapshot.subtotal,
        total: snapshot.total,
        totalQuantity: snapshot.itemCount,
        customerName: snapshot.customerName,
        customerId: snapshot.customerId,
        tableId: snapshot.tableId,
        discount: snapshot.discount,
        hold: true,
      })
      if (!result.success || !result.orderId) {
        finishSaleSubmit()
        toast.error(result.error || 'Could not hold order')
        return
      }
      setReviewOpen(false)
      resetSale()
      toast.success('Order held', {
        description: `Saved (#${result.orderId.slice(0, 8)})`,
      })
    } catch {
      finishSaleSubmit()
      toast.error('Could not hold order')
    } finally {
      holdInFlight.current = false
    }
  }

  const browser = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      <div className="rounded-full bg-muted/55 p-1">
        <div className="flex gap-1">
          {MODES.map((mode) => {
            const selected = checkoutMode === mode.id
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setCheckoutMode(mode.id)}
                className={cn(
                  'flex-1 rounded-full py-2.5 text-sm transition',
                  selected
                    ? 'bg-card font-semibold text-foreground shadow-sm'
                    : 'font-medium text-muted-foreground hover:text-foreground',
                )}
              >
                {mode.label}
              </button>
            )
          })}
        </div>
      </div>

      <CheckoutContextBar
        vendorId={profile?.id}
        showContext={
          checkoutMode !== 'keypad' || orderType === 'delivery' || orderType === 'dine_in'
        }
      />

      {checkoutMode === 'keypad' && <KeypadSalePanel />}
      {checkoutMode === 'menu' && <MenuPanel />}
      {checkoutMode === 'favorites' && <FavoritesPanel />}
    </div>
  )

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
        <p className="text-lg font-bold">Checkout</p>
        <div className="flex items-center gap-2">
          <HeldOrdersPanel />
          <button
            type="button"
            onClick={resetSale}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-muted"
          >
            <RotateCcw className="h-4 w-4" />
            New sale
          </button>
        </div>
      </header>

      {split ? (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.5fr)_minmax(320px,400px)] gap-4 p-5">
          {browser}
          <CartPanel onPay={openReview} />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-hidden p-5">{browser}</div>
          {cart.length > 0 && (
            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border bg-card px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{getItemCount()} items</p>
                <p className="font-bold">{formatCurrency(getTotal())}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void handleHold()}
                  className="rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                >
                  Hold
                </button>
                <button
                  type="button"
                  onClick={openReview}
                  className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
                >
                  Pay
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <ReviewSaleDialog
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onEdit={() => setReviewOpen(false)}
        onHold={() => void handleHold()}
        holding={holdInFlight.current}
        onPay={() => {
          setReviewOpen(false)
          setPayOpen(true)
        }}
      />
      <PaymentDialog open={payOpen} onClose={() => setPayOpen(false)} />
    </div>
  )
}
