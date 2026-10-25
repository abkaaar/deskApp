import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { useAuthStore } from '@/app/stores/authStore'
import { useSyncStore } from '@/app/stores/syncStore'
import { pushCustomerDisplaySnapshot } from '@/lib/checkout/customerDisplayMirror'
import { formatCurrency, parseKeypadAmount } from '@/lib/checkout/format'
import { createPosOrderFromCart } from '@/lib/checkout/posCheckoutService'
import {
  enqueueOfflineSale,
  isBrowserOffline,
} from '@/lib/checkout/saleOutbox'
import type { CreatePosOrderPayload, PaymentMethod } from '@/lib/checkout/types'
import { loadReceiptSettings, runPostSaleReceipt } from '@/lib/receipt/receiptService'
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

type CardPhase = 'idle' | 'initiated'

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
  const refreshSync = useSyncStore((s) => s.refresh)

  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [paymentReference, setPaymentReference] = useState('')
  const [cardPhase, setCardPhase] = useState<CardPhase>('idle')
  const inFlight = useRef(false)

  useEffect(() => {
    if (!open) {
      setMethod('cash')
      setPaymentReference('')
      setCardPhase('idle')
    }
  }, [open])

  const tenderedAmount = parseKeypadAmount(cashTendered)
  const changeDue = useMemo(() => Math.max(0, tenderedAmount - total), [tenderedAmount, total])
  const needsCashTender = method === 'cash'
  const needsReference = method === 'transfer' || method === 'wallet'
  const needsCardConfirm = method === 'card'

  const canConfirm =
    total > 0 &&
    !isSubmitting &&
    dineInReady() &&
    (!needsCashTender || tenderedAmount >= total) &&
    (!needsReference || paymentReference.trim().length >= 3) &&
    (!needsCardConfirm || cardPhase === 'initiated')

  if (!open) return null

  const confirmLabel = () => {
    if (isSubmitting) return 'Processing…'
    if (method === 'cash') return 'Confirm cash payment'
    if (method === 'transfer' || method === 'wallet') return 'Confirm received'
    if (method === 'card' && cardPhase === 'idle') return 'Initiate card payment'
    return 'Confirm card paid'
  }

  const handlePrimary = async () => {
    if (!profile?.id || inFlight.current || isSubmitting) return
    if (!dineInReady()) {
      toast.error('Select a table for dine-in orders')
      return
    }
    if (total <= 0) return

    if (method === 'card' && cardPhase === 'idle') {
      setCardPhase('initiated')
      toast.message('Card payment initiated', {
        description: 'Confirm only after the terminal succeeds.',
      })
      return
    }

    if (needsCashTender && tenderedAmount < total) {
      toast.error('Cash tendered is less than the amount due')
      return
    }
    if (needsReference && paymentReference.trim().length < 3) {
      toast.error('Enter a transfer / wallet reference')
      return
    }

    const offline = isBrowserOffline()
    if (offline && method !== 'cash') {
      toast.error('Card and transfer payments require a connection', {
        description: 'Use cash offline, or reconnect to confirm non-cash payments.',
      })
      return
    }

    inFlight.current = true
    const snapshot = beginSaleSubmit()
    if (!snapshot) {
      inFlight.current = false
      toast.error('Unable to start payment')
      return
    }

    const posExternalId = crypto.randomUUID()
    const payload: CreatePosOrderPayload = {
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
      posExternalId,
      paymentReference: needsReference || method === 'card' ? paymentReference.trim() || null : null,
      cashTendered: method === 'cash' ? tenderedAmount : null,
      changeDue: method === 'cash' ? changeDue : null,
    }

    try {
      if (offline && method === 'cash') {
        enqueueOfflineSale(payload)
        refreshSync()
        await pushCustomerDisplaySnapshot('paid', 'Payment received')
        resetSale()
        onClose()
        toast.success('Cash sale saved offline', {
          description: 'It will sync automatically when you are back online.',
        })
        return
      }

      const result = await createPosOrderFromCart(payload)

      if (!result.success || !result.orderId) {
        const shouldQueueOffline = result.retryable === true && method === 'cash'

        if (!shouldQueueOffline) {
          finishSaleSubmit()
          toast.error(result.error || 'Failed to complete sale')
          return
        }

        enqueueOfflineSale(payload)
        refreshSync()
        finishSaleSubmit()
        await pushCustomerDisplaySnapshot('paid', 'Payment received')
        resetSale()
        onClose()
        toast.success('Cash sale saved offline', {
          description: 'It will sync automatically when you are back online.',
        })
        return
      }

      const settings = await loadReceiptSettings()
      await runPostSaleReceipt({
        orderId: result.orderId,
        restaurantName: profile.business_name || profile.username || 'Foodma',
        orderType: snapshot.orderType,
        paymentMethod: method,
        paymentReference: payload.paymentReference,
        cashTendered: payload.cashTendered,
        changeDue: payload.changeDue,
        customerName: snapshot.customerName,
        tableLabel: snapshot.tableLabel,
        lines: snapshot.lineItems.map((l) => ({
          title: l.title || l.notes || 'Item',
          quantity: l.quantity,
          unitPrice: l.unit_price,
          subtotal: l.subtotal,
        })),
        subtotal: snapshot.subtotal,
        discount: snapshot.discount,
        total: snapshot.total,
        createdAt: new Date().toISOString(),
      }, settings)

      await pushCustomerDisplaySnapshot('paid', 'Payment received')
      resetSale()
      onClose()
      toast.success('Sale completed', {
        description: `Order recorded (#${result.orderId.slice(0, 8)})`,
      })
    } catch (error) {
      const offlineNow = isBrowserOffline()
      if (method === 'cash' && offlineNow) {
        enqueueOfflineSale(payload)
        refreshSync()
        finishSaleSubmit()
        await pushCustomerDisplaySnapshot('paid', 'Payment received')
        resetSale()
        onClose()
        toast.success('Cash sale saved offline', {
          description: 'Will sync when the connection is back.',
        })
      } else {
        finishSaleSubmit()
        toast.error(
          error instanceof Error ? error.message : 'Payment could not be completed. Cart unchanged.',
        )
      }
    } finally {
      inFlight.current = false
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[20px] border border-border bg-card shadow-xl">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-xl font-bold">Take payment</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Confirm payment only after money is received.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <p className="text-3xl font-bold">{formatCurrency(total)}</p>

          <div className="grid grid-cols-2 gap-2">
            {METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setMethod(m.value)
                  setCardPhase('idle')
                  setPaymentReference('')
                  if (m.value !== 'cash') setCashTendered('')
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
              <button
                type="button"
                className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
                onClick={() => setCashTendered(String(Math.round(total)))}
              >
                Exact
              </button>
              <Keypad value={cashTendered} onChange={setCashTendered} />
            </div>
          )}

          {needsReference && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {method === 'wallet' ? 'Wallet reference' : 'Transfer reference'}
              </label>
              <input
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="e.g. bank alert ref"
                className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary"
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Confirm only after you verify the transfer arrived.
              </p>
            </div>
          )}

          {needsCardConfirm && (
            <div className="rounded-2xl border border-border bg-muted/50 p-4 space-y-2">
              <p className="font-semibold">
                {cardPhase === 'idle' ? 'Card payment' : 'Awaiting terminal confirmation'}
              </p>
              <p className="text-sm text-muted-foreground">
                {cardPhase === 'idle'
                  ? 'Start the payment on the terminal, then confirm success here.'
                  : 'Do not confirm until the terminal shows approved.'}
              </p>
              {cardPhase === 'initiated' && (
                <input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Terminal / auth code (optional)"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  disabled={isSubmitting}
                />
              )}
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
          {method === 'card' && cardPhase === 'initiated' && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setCardPhase('idle')}
              className="rounded-full border border-border px-4 py-3 text-sm font-semibold"
            >
              Fail / retry
            </button>
          )}
          <button
            type="button"
            disabled={
              method === 'card' && cardPhase === 'idle'
                ? isSubmitting || total <= 0
                : !canConfirm
            }
            onClick={() => void handlePrimary()}
            className={cn(
              'flex-[1.4] rounded-full py-3 text-sm font-bold transition',
              (method === 'card' && cardPhase === 'idle') || canConfirm
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'cursor-not-allowed bg-muted text-muted-foreground',
            )}
          >
            {confirmLabel()}
          </button>
        </div>
      </div>
    </div>
  )
}
