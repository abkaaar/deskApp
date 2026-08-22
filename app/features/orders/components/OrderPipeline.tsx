import { Check } from 'lucide-react'

import { VENDOR_PIPELINE_STEPS, getPipelineIndex } from '@/lib/orders/status'
import type { Order } from '@/lib/types/order'
import { cn } from '@/lib/utils'

type OrderPipelineProps = {
  order: Order
}

export function OrderPipeline({ order }: OrderPipelineProps) {
  const activeIndex = getPipelineIndex(order)
  const isCancelled = order.status === 'cancelled'

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        Order flow
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {VENDOR_PIPELINE_STEPS.map((step, index) => {
          const isComplete = !isCancelled && activeIndex > index
          const isCurrent = !isCancelled && activeIndex === index

          return (
            <div
              key={step.key}
              className={cn(
                'rounded-xl border px-3 py-2.5 transition',
                isCurrent && 'border-primary bg-primary/10',
                isComplete && 'border-success/30 bg-success/5',
                !isCurrent && !isComplete && 'border-border bg-muted/30',
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                    isCurrent && 'bg-primary text-primary-foreground',
                    isComplete && 'bg-success text-success-foreground',
                    !isCurrent && !isComplete && 'bg-muted text-muted-foreground',
                  )}
                >
                  {isComplete ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{step.label}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {isCancelled && (
        <p className="text-sm text-destructive">This order was cancelled.</p>
      )}
    </div>
  )
}
