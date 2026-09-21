import type { OrderType, PaymentMethod } from '@/lib/checkout/types'
import type { Order } from '@/lib/types/order'

const POS_MARKER = 'pos'

export interface PosOrderMeta {
  type: typeof POS_MARKER
  orderType: OrderType
  paymentMethod: PaymentMethod
  customerName?: string | null
  customerId?: string | null
  tableId?: string | null
  customAmounts?: string | null
  held?: boolean
  paymentReference?: string | null
}

export type PosOrderMetaInput = {
  orderType: OrderType
  paymentMethod: PaymentMethod
  customerName?: string | null
  customerId?: string | null
  tableId?: string | null
  customAmounts?: string | null
  held?: boolean
  paymentReference?: string | null
}

/** Serialize POS-only metadata into the shared `orders.notes` column. */
export function encodePosNotes(meta: PosOrderMetaInput): string {
  return JSON.stringify({
    type: POS_MARKER,
    orderType: meta.orderType,
    paymentMethod: meta.paymentMethod,
    customerName: meta.customerName?.trim() || null,
    customerId: meta.customerId || null,
    tableId: meta.tableId || null,
    customAmounts: meta.customAmounts?.trim() || null,
    held: meta.held === true ? true : undefined,
    paymentReference: meta.paymentReference?.trim() || null,
  })
}

export function parsePosNotes(notes?: string | null): PosOrderMeta | null {
  if (!notes) return null

  try {
    const parsed = JSON.parse(notes) as Partial<PosOrderMeta> | null
    if (!parsed || parsed.type !== POS_MARKER) return null

    return {
      type: POS_MARKER,
      orderType: parsed.orderType ?? 'dine_in',
      paymentMethod: parsed.paymentMethod ?? 'cash',
      customerName: parsed.customerName ?? null,
      customerId: parsed.customerId ?? null,
      tableId: parsed.tableId ?? null,
      customAmounts: parsed.customAmounts ?? null,
      held: parsed.held === true,
      paymentReference: parsed.paymentReference ?? null,
    }
  } catch {
    return null
  }
}

export function isPosOrder(order: Order): boolean {
  return parsePosNotes(order.notes) !== null
}

export function isHeldPosOrder(order: Order): boolean {
  return parsePosNotes(order.notes)?.held === true
}
