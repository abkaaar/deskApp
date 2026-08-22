import type { Order, OrderStatus } from '@/lib/types/order'

const RECENT_COMPLETED_MS = 15 * 60 * 1000

function isRecentCompleted(order: Order): boolean {
  if (!order.delivered_at) return false
  return Date.now() - new Date(order.delivered_at).getTime() <= RECENT_COMPLETED_MS
}

export function getElapsedMinutes(order: Order): number {
  const anchor = order.confirmed_at ?? order.created_at
  return Math.max(0, Math.floor((Date.now() - new Date(anchor).getTime()) / 60_000))
}

export function getKdsBumpAction(order: Order): {
  label: string
  nextStatus: OrderStatus
} | null {
  switch (order.status) {
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
  if (order.status === 'delivered' && isRecentCompleted(order)) {
    return { label: 'Recall', nextStatus: 'ready' }
  }
  return null
}

export function splitKitchenColumns(orders: Order[]) {
  const preparing = orders.filter((order) =>
    ['pending', 'pending_payment', 'confirmed', 'preparing'].includes(order.status),
  )
  const ready = orders.filter((order) => order.status === 'ready')
  const completed = orders.filter((order) => order.status === 'delivered')
  return { preparing, ready, completed }
}
