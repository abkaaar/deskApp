import {
  ACTIVE_DELIVERY_STATUSES,
  DELIVERY_PIPELINE,
  type Delivery,
  type DeliveryStatus,
} from '@/lib/types/delivery'
import type { Order } from '@/lib/types/order'
import { getDeliveryStatusLabel } from '@/lib/orders/status'

export { getDeliveryStatusLabel, DELIVERY_PIPELINE, ACTIVE_DELIVERY_STATUSES }

export function isActiveDelivery(status: DeliveryStatus): boolean {
  return ACTIVE_DELIVERY_STATUSES.includes(status)
}

export function getDeliveryPipelineIndex(status: DeliveryStatus): number {
  if (status === 'cancelled') return -1
  const index = DELIVERY_PIPELINE.findIndex((step) => step.key === status)
  return index >= 0 ? index : 0
}

export function getCustomerTrackingLabel(status: DeliveryStatus): string {
  const labels: Record<DeliveryStatus, string> = {
    pending: 'Finding a rider for your order',
    assigned: 'A rider has been assigned',
    en_route_vendor: 'Rider is heading to the restaurant',
    picked_up: 'Your order has been picked up',
    en_route_customer: 'Your order is on the way',
    delivered: 'Delivered — enjoy your meal',
    cancelled: 'Delivery was cancelled',
  }
  return labels[status]
}

export function getNextDeliveryAction(
  delivery: Delivery,
): { label: string; nextStatus: DeliveryStatus } | null {
  if (delivery.status === 'delivered' || delivery.status === 'cancelled') return null

  // Rider-managed: vendor waits after request; can still complete as fallback
  if (delivery.delivery_type === 'rider') {
    if (delivery.status === 'pending') return null
    if (delivery.status === 'en_route_customer' || delivery.status === 'picked_up') {
      return { label: 'Mark Delivered', nextStatus: 'delivered' }
    }
    return null
  }

  // Vendor-managed self-delivery bumps
  switch (delivery.status) {
    case 'assigned':
    case 'pending':
      return { label: 'En Route to Pickup', nextStatus: 'en_route_vendor' }
    case 'en_route_vendor':
      return { label: 'Mark Picked Up', nextStatus: 'picked_up' }
    case 'picked_up':
      return { label: 'On The Way', nextStatus: 'en_route_customer' }
    case 'en_route_customer':
      return { label: 'Mark Delivered', nextStatus: 'delivered' }
    default:
      return null
  }
}

export function needsDeliveryAssignment(order: Order): boolean {
  if (order.delivery_method !== 'delivery') return false
  if (order.status === 'delivered' || order.status === 'cancelled') return false
  if (order.notes?.includes('pos:') || order.notes?.includes('"type":"pos"')) return false

  const delivery = order.delivery
  if (!delivery) return true
  return delivery.status === 'cancelled'
}

export function formatDistanceKm(distanceKm?: number | null): string {
  if (distanceKm == null || !Number.isFinite(distanceKm)) return '—'
  return `${distanceKm.toFixed(1)} km`
}
