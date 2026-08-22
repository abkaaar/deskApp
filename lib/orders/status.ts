import { isPosOrder, parsePosNotes } from '@/lib/checkout/pos-order'
import type { DeliveryStatus, Order, OrderStatus } from '@/lib/types/order'

export type PipelineStep = {
  key: string
  label: string
  description: string
}

export const VENDOR_PIPELINE_STEPS: PipelineStep[] = [
  { key: 'accept', label: 'Accept', description: 'Confirm the incoming order' },
  { key: 'preparing', label: 'Preparing', description: 'Kitchen is working on the order' },
  { key: 'ready', label: 'Ready', description: 'Order is ready for pickup or handoff' },
  { key: 'completed', label: 'Completed', description: 'Order fulfilled at the restaurant' },
  { key: 'delivery_assigned', label: 'Delivery Assigned', description: 'Rider or vendor delivery is active' },
  { key: 'delivered', label: 'Delivered', description: 'Customer received the order' },
]

const ONGOING_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready']
const COMPLETED_STATUSES: OrderStatus[] = ['delivered', 'cancelled']

export function isOngoingOrder(status: OrderStatus): boolean {
  return ONGOING_STATUSES.includes(status)
}

export function isCompletedOrder(status: OrderStatus): boolean {
  return COMPLETED_STATUSES.includes(status)
}

export function formatOrderId(orderId: string): string {
  const shortId = String(orderId).replace(/-/g, '').substring(0, 8).toUpperCase()
  return `#${shortId}`
}

export function getStatusLabel(status: OrderStatus, deliveryMethod?: Order['delivery_method']): string {
  const isPickup = deliveryMethod === 'pickup'

  const labels: Record<OrderStatus, string> = {
    pending_payment: 'Payment Required',
    pending: 'Pending',
    confirmed: isPickup ? 'Accepted' : 'Preparing',
    preparing: 'Preparing',
    ready: 'Ready',
    delivered: isPickup ? 'Picked Up' : 'Delivered',
    cancelled: 'Cancelled',
  }

  return labels[status] ?? status
}

export function getDeliveryStatusLabel(status: DeliveryStatus): string {
  const labels: Record<DeliveryStatus, string> = {
    pending: 'Finding Rider',
    assigned: 'Delivery Assigned',
    en_route_vendor: 'Rider En Route',
    picked_up: 'Picked Up',
    en_route_customer: 'On The Way',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  }

  return labels[status] ?? status
}

export function getPipelineIndex(order: Order): number {
  if (order.status === 'cancelled') return -1
  if (order.status === 'delivered') return 5

  const delivery = order.delivery
  if (
    order.delivery_method === 'delivery' &&
    delivery &&
    delivery.status !== 'cancelled' &&
    ['assigned', 'en_route_vendor', 'picked_up', 'en_route_customer'].includes(delivery.status)
  ) {
    return 4
  }

  if (order.status === 'ready') return 2
  if (order.status === 'confirmed' || order.status === 'preparing') return 1
  if (order.status === 'pending' || order.status === 'pending_payment') return 0

  return 0
}

export function getNextVendorAction(order: Order): {
  label: string
  nextStatus: OrderStatus
  requiresDeliveryTime?: boolean
} | null {
  if (order.status === 'delivered' || order.status === 'cancelled') return null

  switch (order.status) {
    case 'pending':
    case 'pending_payment':
      return { label: 'Accept Order', nextStatus: 'confirmed', requiresDeliveryTime: true }
    case 'confirmed':
    case 'preparing':
      return { label: 'Mark Ready', nextStatus: 'ready' }
    case 'ready':
      if (order.delivery_method === 'delivery' && order.delivery?.status !== 'delivered') {
        return { label: 'Mark Delivered', nextStatus: 'delivered' }
      }
      return { label: 'Complete Order', nextStatus: 'delivered' }
    default:
      return null
  }
}

export function getOrderSourceLabel(order: Order): string {
  if (isPosOrder(order) || parsePosNotes(order.notes)) return 'POS'
  if (order.notes?.includes('pos:')) return 'POS'
  return 'Online'
}
