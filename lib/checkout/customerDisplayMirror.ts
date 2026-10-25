import type { CustomerDisplayState } from '@/lib/shared/customerDisplay'
import { useCheckoutStore } from '@/app/features/checkout/checkoutStore'

let paidHoldUntil = 0

export function buildCustomerDisplayState(
  phase: CustomerDisplayState['phase'] = 'active',
  thankYouMessage?: string | null,
): CustomerDisplayState {
  const state = useCheckoutStore.getState()
  const itemCount = state.getItemCount()
  const lines = state.cart.map((line) => ({
    title: line.title,
    quantity: line.quantity,
    unitPrice: line.price,
    subtotal: line.subtotal,
  }))

  const resolvedPhase: CustomerDisplayState['phase'] =
    phase === 'paid' ? 'paid' : itemCount > 0 ? 'active' : 'idle'

  return {
    lines,
    orderType: state.orderType,
    tableLabel: state.tableLabel,
    customerName: state.customerName,
    subtotal: state.getSubtotal(),
    discount: state.getDiscount(),
    total: state.getTotal(),
    itemCount,
    phase: resolvedPhase,
    thankYouMessage: thankYouMessage ?? null,
  }
}

export async function pushCustomerDisplaySnapshot(
  phase?: CustomerDisplayState['phase'],
  thankYouMessage?: string | null,
): Promise<void> {
  try {
    const open = await window.api.customerDisplay.isOpen()
    if (!open) return

    if (phase === 'paid') {
      paidHoldUntil = Date.now() + 4500
      await window.api.customerDisplay.pushState(
        buildCustomerDisplayState('paid', thankYouMessage ?? 'Payment received'),
      )
      window.setTimeout(() => {
        if (Date.now() >= paidHoldUntil) {
          void pushCustomerDisplaySnapshot('idle')
        }
      }, 4600)
      return
    }

    if (Date.now() < paidHoldUntil) return

    await window.api.customerDisplay.pushState(buildCustomerDisplayState(phase, thankYouMessage))
  } catch {
    // CDP is best-effort — never block checkout.
  }
}

/** Subscribe checkout store → customer display while the CDP window may be open. */
export function startCustomerDisplayMirror(): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null

  const flush = () => {
    timer = null
    void pushCustomerDisplaySnapshot()
  }

  const unsubscribe = useCheckoutStore.subscribe(() => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(flush, 80)
  })

  void pushCustomerDisplaySnapshot()

  return () => {
    unsubscribe()
    if (timer) clearTimeout(timer)
  }
}
