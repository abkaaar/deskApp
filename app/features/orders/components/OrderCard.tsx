import { ChevronRight, RefreshCw } from 'lucide-react'

import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { formatCurrency } from '@/lib/checkout/format'
import {
  formatOrderId,
  getDeliveryStatusLabel,
  getOrderSourceLabel,
  getStatusLabel,
} from '@/lib/orders/status'
import type { Order } from '@/lib/types/order'
import { cn } from '@/lib/utils'

type OrderCardProps = {
  order: Order
  onUpdateStatus: (order: Order) => void
}

export function OrderCard({ order, onUpdateStatus }: OrderCardProps) {
  const lineItems = order.line_items ?? []
  const hasLineItems = lineItems.length > 0
  const itemCount = hasLineItems
    ? lineItems.reduce((sum, li) => sum + (li.quantity || 1), 0)
    : order.quantity || 1

  const primaryImage = hasLineItems
    ? lineItems[0]?.post?.image_url || order.post?.image_url
    : order.post?.image_url

  const itemsSummary = hasLineItems
    ? lineItems
        .map((li) => li.post?.title || 'Item')
        .slice(0, 2)
        .join(', ') + (lineItems.length > 2 ? ` +${lineItems.length - 2} more` : '')
    : order.post?.title || 'Order items'

  const canUpdate = order.status !== 'delivered' && order.status !== 'cancelled'
  const source = getOrderSourceLabel(order)

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Order {formatOrderId(order.id)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleString('en-NG', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Badge variant="outline">{source}</Badge>
          <Badge
            className={cn(
              order.status === 'pending' && 'bg-warning/15 text-warning border-warning/30',
              order.status === 'confirmed' && 'bg-primary/15 text-primary border-primary/30',
              order.status === 'ready' && 'bg-success/15 text-success border-success/30',
              order.status === 'delivered' && 'bg-muted text-muted-foreground',
              order.status === 'cancelled' && 'bg-destructive/15 text-destructive border-destructive/30',
            )}
          >
            {getStatusLabel(order.status, order.delivery_method)}
          </Badge>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
          {primaryImage ? (
            <img src={primaryImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-2xl">🍽️</div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{itemsSummary}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
            {order.buyer?.username ? ` · @${order.buyer.username}` : ''}
          </p>
          <p className="mt-2 text-sm font-semibold text-primary">{formatCurrency(order.total)}</p>
          <p className="mt-1 text-xs capitalize text-muted-foreground">
            {order.delivery_method}
            {order.delivery_time ? ` · ${order.delivery_time}` : ''}
          </p>
          {order.delivery && (
            <p className="mt-1 text-xs text-muted-foreground">
              Delivery: {getDeliveryStatusLabel(order.delivery.status)}
            </p>
          )}
        </div>
      </div>

      {canUpdate && (
        <Button
          variant="outline"
          className="mt-4 w-full justify-between"
          onClick={() => onUpdateStatus(order)}
        >
          <span className="inline-flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" />
            Update Status
          </span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </article>
  )
}
