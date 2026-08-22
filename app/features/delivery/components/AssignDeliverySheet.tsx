import { useEffect, useState } from 'react'
import { Bike, Store } from 'lucide-react'
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
import { formatDistanceKm } from '@/lib/delivery/status'
import { formatOrderId } from '@/lib/orders/status'
import { DeliveryService } from '@/lib/services/deliveryService'
import type { Order } from '@/lib/types/order'

type AssignDeliverySheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendorId?: string
  order: Order | null
  orderIdFallback?: string | null
  onAssigned: () => void
}

export function AssignDeliverySheet({
  open,
  onOpenChange,
  vendorId,
  order,
  orderIdFallback,
  onAssigned,
}: AssignDeliverySheetProps) {
  const orderId = order ? String(order.id) : orderIdFallback || null
  const [loading, setLoading] = useState<'rider' | 'vendor' | null>(null)
  const [preview, setPreview] = useState<Awaited<
    ReturnType<typeof DeliveryService.resolveDeliveryCoords>
  >['data']>(null)

  useEffect(() => {
    if (!open || !vendorId || !orderId) {
      setPreview(null)
      return
    }

    void DeliveryService.resolveDeliveryCoords(orderId, vendorId).then((result) => {
      if (result.error) {
        toast.error(result.error)
        setPreview(null)
        return
      }
      setPreview(result.data)
    })
  }, [open, vendorId, orderId])

  const handleAssign = async (mode: 'rider' | 'vendor') => {
    if (!vendorId || !orderId) return

    setLoading(mode)
    const result =
      mode === 'rider'
        ? await DeliveryService.requestRider(orderId, vendorId)
        : await DeliveryService.assignSelfDelivery(orderId, vendorId)
    setLoading(null)

    if (!result.success) {
      toast.error(result.error || 'Could not assign delivery')
      return
    }

    toast.success(
      mode === 'rider'
        ? 'Rider requested — nearby riders can accept'
        : 'Self-delivery started — customer will see tracking updates',
    )
    onAssigned()
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            Assign delivery{orderId ? ` · ${formatOrderId(orderId)}` : ''}
          </SheetTitle>
          <SheetDescription>
            Request a Foodma rider or deliver it yourself. Customers track status in the app.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {order && (
            <div className="rounded-xl border border-border p-3 text-sm">
              <p className="font-medium">
                {order.buyer?.name || order.buyer?.username || 'Customer'}
              </p>
              <p className="mt-1 text-muted-foreground">
                {order.delivery_address || 'No delivery address on order'}
              </p>
              <p className="mt-2 text-muted-foreground">
                Order {formatCurrency(order.total)} · Delivery fee{' '}
                {formatCurrency(order.delivery_fee || 0)}
              </p>
            </div>
          )}

          {preview && (
            <div className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
              <p>
                Distance {formatDistanceKm(preview.distance_km)} · Fee{' '}
                {formatCurrency(preview.fee)}
              </p>
              <p className="mt-1">Pickup: {preview.pickup_address}</p>
              <p className="mt-1">Drop-off: {preview.delivery_address}</p>
              {!preview.canRequestRider && (
                <p className="mt-2 text-amber-700 dark:text-amber-300">{preview.reason}</p>
              )}
            </div>
          )}

          <Button
            className="h-12 w-full justify-start gap-3"
            disabled={loading != null || !preview?.canRequestRider}
            onClick={() => void handleAssign('rider')}
          >
            <Bike className="h-5 w-5" />
            <span className="text-left">
              <span className="block font-semibold">
                {loading === 'rider' ? 'Requesting...' : 'Request rider'}
              </span>
              <span className="block text-xs font-normal opacity-90">
                Broadcast to nearby riders
              </span>
            </span>
          </Button>

          <Button
            variant="secondary"
            className="h-12 w-full justify-start gap-3"
            disabled={loading != null}
            onClick={() => void handleAssign('vendor')}
          >
            <Store className="h-5 w-5" />
            <span className="text-left">
              <span className="block font-semibold">
                {loading === 'vendor' ? 'Starting...' : "I'll deliver myself"}
              </span>
              <span className="block text-xs font-normal opacity-90">
                Update status as you go — customer tracks live
              </span>
            </span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
