import type { CartLine, OrderType } from '@/lib/checkout/types'
import type { HeldCartRecord } from '@/lib/shared/types'

export const HOLDS_CHANGED_EVENT = 'foodpos:holds-changed'

export type HeldCartPayload = {
  orderType: OrderType
  cart: CartLine[]
  discountNaira: number
  customerId: string | null
  customerName: string | null
  tableId: string | null
  tableLabel: string | null
}

export type HeldCartView = {
  id: string
  vendorId: string
  label: string | null
  total: number
  itemCount: number
  createdAt: string
  payload: HeldCartPayload
}

export function notifyHoldsChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(HOLDS_CHANGED_EVENT))
}

export function parseHeldCartRecord(row: HeldCartRecord): HeldCartView | null {
  try {
    const payload = JSON.parse(row.payload) as HeldCartPayload
    if (!payload || !Array.isArray(payload.cart) || payload.cart.length === 0) {
      return null
    }
    return {
      id: row.id,
      vendorId: row.vendor_id,
      label: row.label,
      total: Number(row.total) || 0,
      itemCount: Number(row.item_count) || 0,
      createdAt: row.created_at,
      payload: {
        orderType: payload.orderType || 'takeaway',
        cart: payload.cart,
        discountNaira: Number(payload.discountNaira) || 0,
        customerId: payload.customerId ?? null,
        customerName: payload.customerName ?? null,
        tableId: payload.tableId ?? null,
        tableLabel: payload.tableLabel ?? null,
      },
    }
  } catch {
    return null
  }
}

export async function listHeldCarts(vendorId: string): Promise<HeldCartView[]> {
  const rows = await window.api.heldCarts.list(vendorId)
  return rows
    .map(parseHeldCartRecord)
    .filter((row): row is HeldCartView => row !== null)
}

export async function createHeldCart(
  vendorId: string,
  payload: HeldCartPayload,
  meta: { total: number; itemCount: number; label?: string | null },
): Promise<HeldCartRecord> {
  const record = await window.api.heldCarts.create({
    vendor_id: vendorId,
    label: meta.label ?? null,
    payload: JSON.stringify(payload),
    total: meta.total,
    item_count: meta.itemCount,
  })
  notifyHoldsChanged()
  return record
}

export async function deleteHeldCart(
  id: string,
  vendorId?: string,
): Promise<boolean> {
  const ok = await window.api.heldCarts.delete(id, vendorId)
  if (ok) notifyHoldsChanged()
  return ok
}
