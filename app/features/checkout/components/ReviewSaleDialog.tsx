import { formatCurrency } from '@/lib/checkout/format'

import { useCheckoutStore } from '../checkoutStore'

type ReviewSaleDialogProps = {
  open: boolean
  onClose: () => void
  onEdit: () => void
  onPay: () => void
  onHold: () => void
  holding?: boolean
}

export function ReviewSaleDialog({
  open,
  onClose,
  onEdit,
  onPay,
  onHold,
  holding = false,
}: ReviewSaleDialogProps) {
  const cart = useCheckoutStore((s) => s.cart)
  const orderType = useCheckoutStore((s) => s.orderType)
  const customerName = useCheckoutStore((s) => s.customerName)
  const tableLabel = useCheckoutStore((s) => s.tableLabel)
  const getSubtotal = useCheckoutStore((s) => s.getSubtotal)
  const getDiscount = useCheckoutStore((s) => s.getDiscount)
  const getTotal = useCheckoutStore((s) => s.getTotal)
  const dineInReady = useCheckoutStore((s) => s.dineInReady)
  const isSubmitting = useCheckoutStore((s) => s.isSubmitting)

  if (!open) return null

  const orderTypeLabel =
    orderType === 'dine_in' ? 'Dine-in' : orderType === 'takeaway' ? 'Takeaway' : 'Delivery'
  const subtotal = getSubtotal()
  const discount = getDiscount()
  const total = getTotal()
  const canContinue = cart.length > 0 && dineInReady() && !isSubmitting && !holding

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[20px] border border-border bg-card shadow-xl">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-xl font-bold">Review sale</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Confirm items before taking payment.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-muted px-3 py-1 font-medium">{orderTypeLabel}</span>
            {tableLabel && (
              <span className="rounded-full bg-muted px-3 py-1">Table: {tableLabel}</span>
            )}
            {customerName && (
              <span className="rounded-full bg-muted px-3 py-1">{customerName}</span>
            )}
          </div>

          <ul className="space-y-2">
            {cart.map((line) => (
              <li
                key={line.line_key}
                className="flex items-start justify-between gap-3 rounded-xl border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="font-medium">{line.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {line.quantity} × {formatCurrency(line.price)}
                    {line.fulfilment_mode === 'ready' || line.is_custom
                      ? ' · Ready'
                      : ' · Kitchen'}
                  </p>
                </div>
                <p className="shrink-0 font-semibold">{formatCurrency(line.subtotal)}</p>
              </li>
            ))}
          </ul>

          <div className="space-y-1 border-t border-border pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-primary">
                <span>Discount</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {!dineInReady() && (
            <p className="text-sm text-destructive">Select a table for dine-in orders.</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border p-4">
          <button
            type="button"
            disabled={isSubmitting || holding}
            onClick={onClose}
            className="rounded-full px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting || holding}
            onClick={onEdit}
            className="rounded-full border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
          >
            Edit
          </button>
          <button
            type="button"
            disabled={!canContinue}
            onClick={onHold}
            className="rounded-full border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50"
          >
            {holding ? 'Holding…' : 'Hold'}
          </button>
          <button
            type="button"
            disabled={!canContinue}
            onClick={onPay}
            className="ml-auto rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            Pay
          </button>
        </div>
      </div>
    </div>
  )
}
