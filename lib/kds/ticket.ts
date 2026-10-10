import { isHeldPosOrder } from '@/lib/checkout/pos-order'
import { effectiveKitchenLane, orderStatusToKitchenStatus } from '@/lib/checkout/posOrderStatus'
import type { KitchenStatus, Order, OrderStatus } from '@/lib/types/order'

const RECENT_COMPLETED_MS = 15 * 60 * 1000

function isRecentCompleted(order: Order): boolean {
  const lane = effectiveKitchenLane(order)
  if (lane !== 'completed') return false
  if (!order.delivered_at) return false
  return Date.now() - new Date(order.delivered_at).getTime() <= RECENT_COMPLETED_MS
}

export function getElapsedMinutes(order: Order): number {
  const anchor = order.confirmed_at ?? order.created_at
  return Math.max(0, Math.floor((Date.now() - new Date(anchor).getTime()) / 60_000))
}

/** Display / bump status — kitchen_status for POS, else marketplace status. */
export function getTicketStatus(order: Order): OrderStatus {
  const kitchen = (order.kitchen_status || '').toLowerCase() as KitchenStatus | ''
  if (kitchen === 'preparing' || kitchen === 'pending') return 'preparing'
  if (kitchen === 'ready') return 'ready'
  if (kitchen === 'completed') return 'delivered'
  if (kitchen === 'cancelled') return 'cancelled'
  return order.status
}

export function getKdsBumpAction(order: Order): {
  label: string
  nextStatus: OrderStatus
} | null {
  const ticket = getTicketStatus(order)
  switch (ticket) {
    case 'pending':
    case 'pending_payment':
    case 'confirmed':
      return { label: 'Start preparing', nextStatus: 'preparing' }
    case 'preparing':
      return { label: 'Mark ready', nextStatus: 'ready' }
    case 'ready':
      return { label: 'Complete', nextStatus: 'delivered' }
    default:
      return null
  }
}

/** Recall a recently completed ticket back to Ready. */
export function getKdsRecallAction(order: Order): {
  label: string
  nextStatus: OrderStatus
} | null {
  if (getTicketStatus(order) === 'delivered' && isRecentCompleted(order)) {
    return { label: 'Recall', nextStatus: 'ready' }
  }
  return null
}

export function splitKitchenColumns(orders: Order[]) {
  // Unpaid held tickets (legacy cloud holds) must not appear on KDS.
  const live = orders.filter(
    (order) => !(isHeldPosOrder(order) && order.payment_status !== 'paid'),
  )
  const preparing = live.filter((order) => effectiveKitchenLane(order) === 'preparing')
  const ready = live.filter((order) => effectiveKitchenLane(order) === 'ready')
  const completed = live.filter((order) => effectiveKitchenLane(order) === 'completed')
  return { preparing, ready, completed }
}

export { orderStatusToKitchenStatus }
