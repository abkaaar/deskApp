import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/app/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet'
import { formatCurrency } from '@/lib/checkout/format'
import { formatOrderId, getNextVendorAction } from '@/lib/orders/status'
import { OrderService } from '@/lib/services/orderService'
import type { Order, OrderStatus } from '@/lib/types/order'

import { OrderPipeline } from './OrderPipeline'

const DELIVERY_TIMES = ['15', '20', '30', '45'] as const

type OrderStatusSheetProps = {
  order: Order | null
  vendorId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (order: Order) => void
}

export function OrderStatusSheet({
  order,
  vendorId,
  open,
  onOpenChange,
  onUpdated,
}: OrderStatusSheetProps) {
  const [deliveryTime, setDeliveryTime] = useState('20')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (order?.delivery_time) {
      const match = order.delivery_time.match(/\d+/)
      if (match) setDeliveryTime(match[0])
    }
  }, [order])

  if (!order) return null

  const nextAction = getNextVendorAction(order)
  const lineItems = order.line_items ?? []

  const handleStatusUpdate = async (nextStatus: OrderStatus, withDeliveryTime = false) => {
    if (!vendorId) return

    setLoading(true)
    try {
      const additionalData: {
        confirmed_at?: string
        delivered_at?: string
        delivery_time?: string
      } = {}

      if (nextStatus === 'confirmed') {
        additionalData.confirmed_at = new Date().toISOString()
      }

      if (nextStatus === 'delivered') {
        additionalData.delivered_at = new Date().toISOString()
      }

      if (withDeliveryTime) {
        const timeResult = await OrderService.updateDeliveryTime(
          order.id,
          `${deliveryTime} mins`,
          vendorId,
        )
        if (!timeResult.success) {
          toast.error(timeResult.error || 'Failed to set delivery time')
          return
        }
        additionalData.delivery_time = `${deliveryTime} mins`
      }

      const result = await OrderService.updateOrderStatus(
        order.id,
        nextStatus,
        vendorId,
        additionalData,
      )

      if (!result.success) {
        toast.error(result.error || 'Failed to update order')
        return
      }

      const updated: Order = {
        ...order,
        status: nextStatus,
        ...additionalData,
      }

      onUpdated(updated)
      toast.success('Order updated', {
        description: `Order ${formatOrderId(order.id)} status changed.`,
      })

      if (nextStatus === 'delivered' || nextStatus === 'cancelled') {
        onOpenChange(false)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    await handleStatusUpdate('cancelled')
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Order {formatOrderId(order.id)}</SheetTitle>
          <SheetDescription>
            Manage order status. Customers are updated automatically on Foodma.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6 px-1">
          <OrderPipeline order={order} />

          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Order total</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{formatCurrency(order.total)}</p>
            <p className="mt-2 text-sm capitalize text-muted-foreground">
              {order.delivery_method}
              {order.delivery_address ? ` · ${order.delivery_address}` : ''}
            </p>
            {order.buyer && (
              <p className="mt-1 text-sm text-muted-foreground">
                Customer: {order.buyer.name || order.buyer.username}
                {order.buyer.phone ? ` · ${order.buyer.phone}` : ''}
              </p>
            )}
          </div>

          {lineItems.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Items</p>
              <ul className="space-y-2">
                {lineItems.map((line) => (
                  <li
                    key={line.id}
                    className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm"
                  >
                    <span className="text-foreground">
                      {line.quantity}x {line.post?.title || 'Item'}
                    </span>
                    <span className="font-medium text-primary">
                      {formatCurrency(line.subtotal)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : order.post ? (
            <div className="rounded-xl border border-border px-3 py-2 text-sm">
              {order.quantity}x {order.post.title}
            </div>
          ) : null}

          {nextAction?.requiresDeliveryTime && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Estimated ready time</p>
              <div className="grid grid-cols-4 gap-2">
                {DELIVERY_TIMES.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setDeliveryTime(time)}
                    className={
                      deliveryTime === time
                        ? 'rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground'
                        : 'rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground hover:bg-accent'
                    }
                  >
                    {time}m
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {nextAction && (
              <Button
                className="w-full"
                disabled={loading}
                onClick={() =>
                  void handleStatusUpdate(
                    nextAction.nextStatus,
                    Boolean(nextAction.requiresDeliveryTime),
                  )
                }
              >
                {loading ? 'Updating…' : nextAction.label}
              </Button>
            )}

            {order.status !== 'delivered' && order.status !== 'cancelled' && (
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
                disabled={loading}
                onClick={() => void handleCancel()}
              >
                Cancel Order
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
