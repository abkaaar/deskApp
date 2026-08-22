import { useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/app/components/ui/badge'
import { useAuthStore } from '@/app/stores/authStore'
import { formatCurrency } from '@/lib/checkout/format'
import { buildReceiptText, refundPosOrder } from '@/lib/checkout/refundReceipt'
import { formatOrderId, getStatusLabel } from '@/lib/orders/status'
import { cn } from '@/lib/utils'

import type { TransactionRow } from '../hooks/useVendorTransactions'

type TransactionCardProps = {
  row: TransactionRow
  onChanged?: () => void
}

function paymentLabel(method: TransactionRow['paymentMethod']): string {
  switch (method) {
    case 'cash':
      return 'Cash'
    case 'card':
      return 'Card'
    case 'transfer':
      return 'Transfer'
    case 'mixed':
      return 'Mixed'
    case 'online':
      return 'Online'
    default:
      return 'Unknown'
  }
}

export function TransactionCard({ row, onChanged }: TransactionCardProps) {
  const { order, source, paymentMethod, customerLabel } = row
  const profile = useAuthStore((s) => s.profile)
  const [busy, setBusy] = useState(false)

  const canRefund =
    source === 'pos' &&
    order.payment_status === 'paid' &&
    (profile?.role === 'vendor' || profile?.role === 'premium' || !profile?.role)

  const showReceipt = async () => {
    const text = buildReceiptText(
      order,
      profile?.business_name || profile?.name || profile?.username,
    )
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Receipt copied')
    } catch {
      window.alert(text)
    }
  }

  const handleRefund = async () => {
    if (!profile?.id || !canRefund || busy) return
    if (!window.confirm('Refund this sale? Stock will be restored when possible.')) return
    setBusy(true)
    try {
      const result = await refundPosOrder(order.id, profile.id)
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      toast.success('Sale refunded')
      onChanged?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {formatOrderId(order.id)}
            {order.order_number ? (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                · {order.order_number}
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleString('en-NG', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Badge variant="outline">{source === 'pos' ? 'POS' : 'Online'}</Badge>
          <Badge
            className={cn(
              paymentMethod === 'cash' && 'bg-success/15 text-success border-success/30',
              paymentMethod === 'card' && 'bg-primary/15 text-primary border-primary/30',
              paymentMethod === 'transfer' && 'bg-warning/15 text-warning border-warning/30',
              paymentMethod === 'online' && 'bg-muted text-muted-foreground',
            )}
          >
            {paymentLabel(paymentMethod)}
          </Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{customerLabel}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {getStatusLabel(order.status, order.delivery_method)}
            {order.payment_status === 'refunded' ? ' · Refunded' : ''}
            {order.payment_reference ? ` · ${order.payment_reference}` : ''}
          </p>
        </div>
        <p className="text-lg font-semibold tabular-nums text-foreground">
          {formatCurrency(Number(order.total) || 0)}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void showReceipt()}
          className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
        >
          Receipt
        </button>
        {canRefund && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleRefund()}
            className="rounded-full border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive disabled:opacity-50"
          >
            {busy ? 'Refunding…' : 'Refund'}
          </button>
        )}
      </div>
    </article>
  )
}
