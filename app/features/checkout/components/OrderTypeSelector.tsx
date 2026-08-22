import type { OrderType } from '@/lib/checkout/types'
import { cn } from '@/lib/utils'

import { useCheckoutStore } from '../checkoutStore'

const ORDER_TYPES: { value: OrderType; label: string }[] = [
  { value: 'dine_in', label: 'Dine In' },
  { value: 'takeaway', label: 'Takeaway' },
  { value: 'delivery', label: 'Delivery' },
]

export function OrderTypeSelector() {
  const orderType = useCheckoutStore((s) => s.orderType)
  const setOrderType = useCheckoutStore((s) => s.setOrderType)

  return (
    <div className="border-b border-border px-3 py-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Order type
      </p>
      <div className="grid grid-cols-3 gap-2">
        {ORDER_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => setOrderType(type.value)}
            className={cn(
              'rounded-lg px-2 py-2 text-xs font-semibold transition',
              orderType === type.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {type.label}
          </button>
        ))}
      </div>
    </div>
  )
}
