import { DELIVERY_PIPELINE, getDeliveryPipelineIndex } from '@/lib/delivery/status'
import type { DeliveryStatus } from '@/lib/types/delivery'
import { cn } from '@/lib/utils'

type DeliveryPipelineProps = {
  status: DeliveryStatus
}

export function DeliveryPipeline({ status }: DeliveryPipelineProps) {
  const current = getDeliveryPipelineIndex(status)

  if (status === 'cancelled') {
    return (
      <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
        Delivery cancelled
      </p>
    )
  }

  return (
    <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {DELIVERY_PIPELINE.map((step, index) => {
        const done = index <= current
        const active = index === current
        return (
          <li
            key={step.key}
            className={cn(
              'rounded-lg px-2 py-2 text-center text-[11px] font-medium leading-tight',
              done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              active && 'ring-2 ring-primary/40 ring-offset-1 ring-offset-background',
            )}
          >
            {step.label}
          </li>
        )
      })}
    </ol>
  )
}
