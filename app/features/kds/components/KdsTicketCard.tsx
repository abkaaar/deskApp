import { Bell, Clock, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/app/components/ui/button'
import { formatOrderId, getStatusLabel } from '@/lib/orders/status'
import {
  getElapsedMinutes,
  getKdsBumpAction,
  getKdsRecallAction,
} from '@/lib/kds/ticket'
import type { Order, OrderStatus } from '@/lib/types/order'
import { cn } from '@/lib/utils'

type KdsTicketCardProps = {
  order: Order
  updating?: boolean
  flash?: boolean
  onBump: (order: Order, nextStatus: OrderStatus) => Promise<{ success: boolean }>
}

export function KdsTicketCard({ order, updating, flash, onBump }: KdsTicketCardProps) {
  const action = getKdsBumpAction(order)
  const recall = getKdsRecallAction(order)
  const elapsedMinutes = getElapsedMinutes(order)
  const overdue = elapsedMinutes >= 15 && order.status !== 'delivered'

  const runAction = async (nextStatus: OrderStatus, successLabel: string) => {
    const result = await onBump(order, nextStatus)
    if (!result.success) {
      toast.error('Could not update ticket')
      return
    }
    toast.success(successLabel, { icon: <Bell className="h-4 w-4" /> })
  }

  const lineSummary =
    order.line_items?.map((line) => `${line.quantity}× ${line.post?.title ?? 'Item'}`).join(', ') ||
    order.post?.title ||
    'Order items'

  return (
    <article
      className={cn(
        'flex flex-col rounded-2xl border bg-card p-4 shadow-sm transition-[box-shadow,border-color] duration-300',
        flash && 'border-primary ring-2 ring-primary/40 animate-pulse',
        !flash && overdue && 'border-primary/50 ring-1 ring-primary/20',
        !flash && !overdue && 'border-border',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{formatOrderId(order.id)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {getStatusLabel(order.status, order.delivery_method)}
          </p>
        </div>
        <div
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
            overdue ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
          )}
        >
          <Clock className="h-3.5 w-3.5" />
          {elapsedMinutes}m
        </div>
      </div>

      <p className="mt-3 line-clamp-3 text-sm text-foreground">{lineSummary}</p>

      {action && (
        <Button
          size="lg"
          className="mt-4 w-full gap-2 text-base font-semibold"
          disabled={updating}
          onClick={() =>
            void runAction(
              action.nextStatus,
              action.nextStatus === 'ready'
                ? 'Marked ready — customer notified'
                : 'Completed — customer notified',
            )
          }
        >
          {updating ? 'Updating…' : action.label}
        </Button>
      )}

      {recall && (
        <Button
          size="lg"
          variant="outline"
          className="mt-2 w-full gap-2 text-base font-semibold"
          disabled={updating}
          onClick={() => void runAction(recall.nextStatus, 'Recalled to Ready')}
        >
          <RotateCcw className="h-4 w-4" />
          {updating ? 'Updating…' : recall.label}
        </Button>
      )}
    </article>
  )
}
