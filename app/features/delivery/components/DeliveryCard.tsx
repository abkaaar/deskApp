import { Bike, MapPin, Phone, Store, User } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'
import { formatCurrency } from '@/lib/checkout/format'
import {
  formatDistanceKm,
  getCustomerTrackingLabel,
  getDeliveryStatusLabel,
  getNextDeliveryAction,
} from '@/lib/delivery/status'
import { formatOrderId } from '@/lib/orders/status'
import { DeliveryService } from '@/lib/services/deliveryService'
import type { Delivery } from '@/lib/types/delivery'

import { DeliveryPipeline } from './DeliveryPipeline'

type DeliveryCardProps = {
  delivery: Delivery
  vendorId?: string
  busy?: boolean
  onChanged: () => void
  onOpenAssign?: (orderId: string) => void
}

export function DeliveryCard({
  delivery,
  vendorId,
  busy,
  onChanged,
  onOpenAssign,
}: DeliveryCardProps) {
  const next = getNextDeliveryAction(delivery)
  const customer = delivery.order?.buyer
  const isPendingRider = delivery.status === 'pending' && delivery.delivery_type === 'rider'

  const run = async (action: () => Promise<{ success: boolean; error: string | null }>, ok: string) => {
    const result = await action()
    if (!result.success) {
      toast.error(result.error || 'Action failed')
      return
    }
    toast.success(ok)
    onChanged()
  }

  return (
    <Card className="border-border/70">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">
              Order {formatOrderId(delivery.order_id)}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {customer?.name || customer?.username || 'Customer'}
              {customer?.phone ? ` · ${customer.phone}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={delivery.delivery_type === 'vendor' ? 'secondary' : 'default'}>
              {delivery.delivery_type === 'vendor' ? (
                <span className="inline-flex items-center gap-1">
                  <Store className="h-3 w-3" /> Self-delivery
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Bike className="h-3 w-3" /> Rider
                </span>
              )}
            </Badge>
            <Badge variant="outline">{getDeliveryStatusLabel(delivery.status)}</Badge>
          </div>
        </div>

        <DeliveryPipeline status={delivery.status} />

        <div className="rounded-xl border border-dashed border-border bg-muted/30 px-3 py-2 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Customer tracking
          </p>
          <p className="mt-1 text-foreground">{getCustomerTrackingLabel(delivery.status)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Updates push to the Foodma app automatically.
          </p>
        </div>

        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <span className="font-medium text-foreground">Drop-off</span>
              <br />
              {delivery.delivery_address || delivery.order?.delivery_address || '—'}
            </span>
          </p>
          <p>
            Fee {formatCurrency(Number(delivery.fee) || 0)} · {formatDistanceKm(delivery.distance_km)}
            {delivery.order?.total != null ? ` · Order ${formatCurrency(delivery.order.total)}` : ''}
          </p>
        </div>

        {delivery.rider && (
          <div className="flex items-center gap-3 rounded-xl border border-border px-3 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">{delivery.rider.name}</p>
              {delivery.rider.phone && (
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  {delivery.rider.phone}
                </p>
              )}
            </div>
          </div>
        )}

        {isPendingRider && (
          <p className="text-sm text-muted-foreground">
            Waiting for a rider to accept. You can retry or switch to self-delivery.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {next && vendorId && (
            <Button
              disabled={busy}
              onClick={() =>
                void run(
                  () =>
                    DeliveryService.updateDeliveryStatus(delivery.id, vendorId, next.nextStatus),
                  'Delivery status updated — customer notified',
                )
              }
            >
              {busy ? 'Updating...' : next.label}
            </Button>
          )}

          {isPendingRider && vendorId && (
            <>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void run(
                    () => DeliveryService.retryRiderRequest(delivery.order_id, vendorId),
                    'Rider request resent',
                  )
                }
              >
                Retry rider
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void run(
                    () => DeliveryService.cancelPendingRiderRequest(delivery.order_id, vendorId),
                    'Rider request cancelled',
                  )
                }
              >
                Cancel request
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => onOpenAssign?.(delivery.order_id)}
              >
                Switch to self-delivery
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
