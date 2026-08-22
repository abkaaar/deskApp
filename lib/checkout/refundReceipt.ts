import { getSupabaseClient } from '@/lib/supabase/client'
import { parsePosNotes } from '@/lib/checkout/pos-order'
import type { PaymentMethod } from '@/lib/checkout/types'
import type { Order } from '@/lib/types/order'

export type RefundPosOrderResult =
  | { ok: true; method: PaymentMethod; amount: number }
  | { ok: false; message: string }

export async function refundPosOrder(
  orderId: string,
  vendorId: string,
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

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      payment_status: 'refunded',
      status: 'cancelled',
      notes: meta
        ? JSON.stringify({ ...meta, refunded: true })
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

export function buildReceiptText(order: Order, restaurantName?: string | null): string {
  const meta = parsePosNotes(order.notes)
  const lines = order.line_items ?? []
  const header = restaurantName?.trim() || 'Foodpos'
  const parts = [
    header,
    '----------------',
    `Order: ${order.id.slice(0, 8)}`,
    `Date: ${new Date(order.created_at).toLocaleString('en-NG')}`,
    `Type: ${meta?.orderType ?? order.delivery_method}`,
    `Pay: ${meta?.paymentMethod ?? order.payment_status}`,
    '----------------',
  ]
  for (const line of lines) {
    const title = line.post?.title || line.notes || 'Item'
    parts.push(`${line.quantity} x ${title}  ₦${Number(line.subtotal).toLocaleString()}`)
  }
  if ((order.promo_discount ?? 0) > 0) {
    parts.push(`Discount: -₦${Number(order.promo_discount).toLocaleString()}`)
  }
  parts.push('----------------')
  parts.push(`TOTAL: ₦${Number(order.total).toLocaleString()}`)
  parts.push(order.payment_status === 'refunded' ? 'REFUNDED' : 'PAID')
  return parts.join('\n')
}
