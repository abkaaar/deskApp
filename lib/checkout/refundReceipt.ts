import { getSupabaseClient } from '@/lib/supabase/client'
import { parsePosNotes } from '@/lib/checkout/pos-order'
import type { PaymentMethod } from '@/lib/checkout/types'
import type { Order } from '@/lib/types/order'

export type RefundPosOrderResult =
  | { ok: true; method: PaymentMethod; amount: number }
  | { ok: false; message: string }

export type RefundStockOutcome = 'returned_sellable' | 'not_returned' | 'damaged'

export async function refundPosOrder(
  orderId: string,
  vendorId: string,
  options?: {
    stockOutcome?: RefundStockOutcome
    reason?: string
  },
): Promise<RefundPosOrderResult> {
  const supabase = getSupabaseClient()
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('vendor_id', vendorId)
    .maybeSingle()

  if (error || !order) {
    return { ok: false, message: 'Order not found' }
  }

  const row = order as Order
  if (row.payment_status === 'refunded') {
    return { ok: false, message: 'Already refunded' }
  }
  if (row.payment_status !== 'paid') {
    return { ok: false, message: 'Only paid orders can be refunded' }
  }

  const meta = parsePosNotes(row.notes)
  const method = (meta?.paymentMethod ?? 'cash') as PaymentMethod
  if (method === 'mixed') {
    return { ok: false, message: 'Mixed payments cannot be refunded in MVP' }
  }

  const stockOutcome = options?.stockOutcome ?? 'not_returned'
  const restoreStock = stockOutcome === 'returned_sellable'

  if (restoreStock) {
    const { data: lines } = await supabase
      .from('order_line_items')
      .select('post_id, quantity')
      .eq('order_id', orderId)

    for (const line of lines ?? []) {
      if (!line.post_id) continue
      await supabase.rpc('restore_stock', {
        p_post_id: line.post_id,
        p_quantity: line.quantity,
      })
    }
  }

  // Keep fulfillment status; refund is a payment state, not a cancel.
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      payment_status: 'refunded',
      notes: meta
        ? JSON.stringify({
            ...meta,
            refunded: true,
            refundStockOutcome: stockOutcome,
            refundReason: options?.reason?.trim() || undefined,
          })
        : row.notes,
    })
    .eq('id', orderId)
    .eq('vendor_id', vendorId)

  if (updateError) {
    return { ok: false, message: updateError.message || 'Refund failed' }
  }

  return {
    ok: true,
    method,
    amount: Number(row.total) || 0,
  }
}

function receiptPaymentLabel(paymentStatus?: string | null): string {
  const s = (paymentStatus || '').toLowerCase()
  if (s === 'refunded') return 'REFUNDED'
  if (s === 'paid' || s === 'completed') return 'PAID'
  return 'UNPAID'
}

export function buildReceiptText(order: Order, restaurantName?: string | null): string {
  const meta = parsePosNotes(order.notes)
  const lines = order.line_items ?? []
  const header = restaurantName?.trim() || 'Foodpos'
  const paymentLabel = receiptPaymentLabel(order.payment_status)
  const total = Number(order.total) || 0
  const parts = [
    header,
    '----------------',
    `Order: ${String(order.id).slice(0, 8)}`,
    `Date: ${new Date(order.created_at).toLocaleString('en-NG')}`,
    `Type: ${meta?.orderType ?? order.delivery_method}`,
    `Pay: ${meta?.paymentMethod ?? order.payment_status ?? '—'}`,
  ]
  if (meta?.tableId) {
    parts.push(`Table: ${meta.tableId}`)
  }
  parts.push('----------------')
  for (const line of lines) {
    const title = line.post?.title || line.notes || 'Item'
    parts.push(`${line.quantity} x ${title}  ₦${Number(line.subtotal).toLocaleString()}`)
  }
  if ((order.promo_discount ?? 0) > 0) {
    parts.push(`Discount: -₦${Number(order.promo_discount).toLocaleString()}`)
  }
  parts.push('----------------')
  parts.push(`TOTAL: ₦${total.toLocaleString()}`)
  if (paymentLabel === 'UNPAID') {
    parts.push(`Received: ₦0`)
    parts.push(`Due: ₦${total.toLocaleString()}`)
  }
  parts.push(paymentLabel)
  return parts.join('\n')
}
