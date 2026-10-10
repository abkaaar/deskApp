import { useCheckoutStore } from '@/app/features/checkout/checkoutStore'
import { createHeldCart, type HeldCartPayload } from '@/lib/checkout/heldCarts'

/**
 * Park the current checkout cart locally. Does not create a cloud order.
 */
export async function holdCurrentSale(vendorId: string): Promise<
  | { ok: true; holdId: string }
  | { ok: false; error: string }
> {
  const store = useCheckoutStore.getState()
  if (store.isSubmitting || store.cart.length === 0) {
    return { ok: false, error: 'Unable to hold order' }
  }
  if (!store.dineInReady()) {
    return { ok: false, error: 'Select a table for dine-in orders' }
  }

  const cartCopy = store.cart.map((line) => ({ ...line }))
  const snapshot = store.beginSaleSubmit()
  if (!snapshot) {
    return { ok: false, error: 'Unable to hold order' }
  }

  try {
    const payload: HeldCartPayload = {
      orderType: snapshot.orderType,
      cart: cartCopy,
      discountNaira: snapshot.discount,
      customerId: snapshot.customerId,
      customerName: snapshot.customerName,
      tableId: snapshot.tableId,
      tableLabel: snapshot.tableLabel,
    }

    const labelParts = [
      snapshot.orderType === 'dine_in'
        ? snapshot.tableLabel || 'Dine in'
        : snapshot.orderType === 'delivery'
          ? 'Delivery'
          : 'Takeaway',
      snapshot.customerName?.trim() || null,
    ].filter(Boolean)

    const record = await createHeldCart(vendorId, payload, {
      total: snapshot.total,
      itemCount: snapshot.itemCount,
      label: labelParts.join(' · '),
    })

    store.resetSale()
    return { ok: true, holdId: record.id }
  } catch (error) {
    store.finishSaleSubmit()
    console.error('[holdSale] failed:', error)
    return { ok: false, error: 'Could not hold order' }
  }
}
