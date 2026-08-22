import { isPosOrder, parsePosNotes } from '@/lib/checkout/pos-order'
import { isActiveDelivery } from '@/lib/delivery/status'
import type { Delivery } from '@/lib/types/delivery'
import type { Order } from '@/lib/types/order'

export type CashDrawerStatus = 'open' | 'idle'

export type DashboardStats = {
  todaysRevenue: number
  ordersToday: number
  walkInOrders: number
  onlineOrders: number
  pendingKitchenOrders: number
  activeDeliveries: number
  customersServed: number
  averageOrderValue: number
  peakHour: string | null
  cashDrawer: {
    status: CashDrawerStatus
    cashCollected: number
    transactionCount: number
  }
}

function startOfLocalDay(date = new Date()): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfLocalDay(date = new Date()): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

export function isOrderToday(order: Order, now = new Date()): boolean {
  const created = new Date(order.created_at).getTime()
  return created >= startOfLocalDay(now).getTime() && created <= endOfLocalDay(now).getTime()
}

export function isWalkInOrder(order: Order): boolean {
  return isPosOrder(order) || Boolean(parsePosNotes(order.notes)) || Boolean(order.notes?.includes('pos:'))
}

function isCountableToday(order: Order): boolean {
  return order.status !== 'cancelled' && order.status !== 'pending_payment'
}

function customerKey(order: Order, vendorId?: string): string {
  const meta = parsePosNotes(order.notes)
  if (meta?.customerName?.trim()) {
    return `name:${meta.customerName.trim().toLowerCase()}`
  }
  if (isWalkInOrder(order)) {
    return `walkin:${order.id}`
  }
  if (vendorId && order.buyer_id === vendorId) {
    return `walkin:${order.id}`
  }
  return `buyer:${order.buyer_id}`
}

function formatPeakHour(hour: number): string {
  const start = new Date()
  start.setHours(hour, 0, 0, 0)
  const end = new Date()
  end.setHours(hour + 1, 0, 0, 0)
  const fmt = new Intl.DateTimeFormat('en-NG', { hour: 'numeric', hour12: true })
  return `${fmt.format(start)} – ${fmt.format(end)}`
}

export function computeDashboardStats(
  orders: Order[],
  deliveries: Delivery[],
  vendorId?: string,
  now = new Date(),
): DashboardStats {
  const todays = orders.filter((order) => isOrderToday(order, now) && isCountableToday(order))
  const walkIn = todays.filter(isWalkInOrder)
  const online = todays.filter((order) => !isWalkInOrder(order))

  const revenueOrders = todays.filter(
    (order) => order.payment_status === 'paid' || order.status === 'delivered' || isWalkInOrder(order),
  )
  const todaysRevenue = revenueOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0)

  const pendingKitchenOrders = orders.filter(
    (order) => order.status === 'confirmed' || order.status === 'preparing',
  ).length

  const activeDeliveries = deliveries.filter((delivery) => isActiveDelivery(delivery.status)).length

  const customers = new Set(todays.map((order) => customerKey(order, vendorId)))

  const averageOrderValue = todays.length > 0 ? todaysRevenue / todays.length : 0

  const hourCounts = new Map<number, number>()
  for (const order of todays) {
    const hour = new Date(order.created_at).getHours()
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1)
  }
  let peakHour: string | null = null
  let peakCount = 0
  for (const [hour, count] of hourCounts) {
    if (count > peakCount) {
      peakCount = count
      peakHour = formatPeakHour(hour)
    }
  }

  const cashOrders = walkIn.filter((order) => {
    const method = parsePosNotes(order.notes)?.paymentMethod
    return !method || method === 'cash'
  })
  const cashCollected = cashOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0)

  return {
    todaysRevenue,
    ordersToday: todays.length,
    walkInOrders: walkIn.length,
    onlineOrders: online.length,
    pendingKitchenOrders,
    activeDeliveries,
    customersServed: customers.size,
    averageOrderValue,
    peakHour,
    cashDrawer: {
      status: cashOrders.length > 0 ? 'open' : 'idle',
      cashCollected,
      transactionCount: cashOrders.length,
    },
  }
}
