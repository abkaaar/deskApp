import type { OrderStatus } from '@/lib/types/order'

import type { FulfilmentMode, OrderType } from './types'

export type KitchenStatus =
  | 'pending'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled'

export type FulfilmentLineInput = {
  is_custom?: boolean
  post_id?: string
  fulfilment_mode?: FulfilmentMode | null
  title?: string
  quantity?: number
}

/**
 * Resolve cart fulfilment for POS status / KDS.
 * Custom keypad amounts and explicit `ready` lines are ready-to-serve.
 * Any `made_to_order` catalog line requires kitchen.
 */
export function resolveFulfilment(lines: FulfilmentLineInput[]): {
  needsKitchen: boolean
  allReady: boolean
  lineModes: { post_id?: string; title?: string; quantity?: number; fulfilment_mode: FulfilmentMode }[]
} {
  const lineModes = lines.map((line) => {
    const isCustom = line.is_custom === true || Boolean(line.post_id?.startsWith('custom:'))
    const mode: FulfilmentMode =
      isCustom || line.fulfilment_mode === 'ready' ? 'ready' : 'made_to_order'
    return {
      post_id: line.post_id,
      title: line.title,
      quantity: line.quantity,
      fulfilment_mode: mode,
    }
  })
  const needsKitchen = lineModes.some((l) => l.fulfilment_mode === 'made_to_order')
  return {
    needsKitchen,
    allReady: !needsKitchen,
    lineModes,
  }
}

/**
 * Cloud `orders.status` for POS inserts — aligned with Foodpos uploadOrder.
 * Ready-only sales complete immediately; kitchen food stays on preparing.
 */
export function orderTypeToStatus(
  orderType: OrderType,
  isHold: boolean,
  needsKitchen: boolean,
): OrderStatus {
  if (isHold) return 'pending'
  if (!needsKitchen) return 'delivered'
  // Delivery still needs fulfilment logistics; kitchen ticket uses preparing.
  if (orderType === 'delivery') return 'confirmed'
  return 'preparing'
}

export function orderTypeToDeliveryMethod(orderType: OrderType): 'pickup' | 'delivery' {
  return orderType === 'delivery' ? 'delivery' : 'pickup'
}

export function orderTypeToKitchenStatus(
  _orderType: OrderType,
  isHold: boolean,
  needsKitchen: boolean,
): KitchenStatus {
  if (isHold) return 'pending'
  if (!needsKitchen) return 'completed'
  return 'preparing'
}

/** Map marketplace OrderStatus bump → kitchen_status for POS rows. */
export function orderStatusToKitchenStatus(status: OrderStatus): KitchenStatus | null {
  switch (status) {
    case 'pending':
    case 'pending_payment':
      return 'pending'
    case 'confirmed':
    case 'preparing':
      return 'preparing'
    case 'ready':
      return 'ready'
    case 'delivered':
      return 'completed'
    case 'cancelled':
      return 'cancelled'
    default:
      return null
  }
}

/** Effective kitchen ladder for KDS columns (prefer kitchen_status when set). */
export function effectiveKitchenLane(
  order: { status: OrderStatus; kitchen_status?: KitchenStatus | string | null },
): 'preparing' | 'ready' | 'completed' | 'other' {
  const kitchen = (order.kitchen_status || '').toLowerCase()
  if (kitchen === 'ready') return 'ready'
  if (kitchen === 'completed' || kitchen === 'cancelled') return 'completed'
  if (kitchen === 'preparing' || kitchen === 'pending') return 'preparing'

  if (order.status === 'ready') return 'ready'
  if (order.status === 'delivered' || order.status === 'cancelled') return 'completed'
  if (
    order.status === 'pending' ||
    order.status === 'pending_payment' ||
    order.status === 'confirmed' ||
    order.status === 'preparing'
  ) {
    return 'preparing'
  }
  return 'other'
}
