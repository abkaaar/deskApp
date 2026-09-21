import { describe, expect, it } from 'vitest'

import { classifyCheckoutError } from '../classifyCheckoutError'
import {
  effectiveKitchenLane,
  orderTypeToKitchenStatus,
  orderTypeToStatus,
  resolveFulfilment,
} from '../posOrderStatus'

describe('resolveFulfilment', () => {
  it('treats custom lines as ready', () => {
    const r = resolveFulfilment([{ is_custom: true, post_id: 'custom:1' }])
    expect(r.allReady).toBe(true)
    expect(r.needsKitchen).toBe(false)
  })

  it('needs kitchen when any made_to_order line', () => {
    const r = resolveFulfilment([
      { fulfilment_mode: 'ready', post_id: 'a' },
      { fulfilment_mode: 'made_to_order', post_id: 'b' },
    ])
    expect(r.needsKitchen).toBe(true)
    expect(r.allReady).toBe(false)
  })

  it('all ready when only ready catalog lines', () => {
    const r = resolveFulfilment([{ fulfilment_mode: 'ready', post_id: 'a' }])
    expect(r.allReady).toBe(true)
  })
})

describe('orderTypeToKitchenStatus', () => {
  it('maps hold to pending', () => {
    expect(orderTypeToKitchenStatus('dine_in', true, true)).toBe('pending')
  })

  it('maps ready-only to completed', () => {
    expect(orderTypeToKitchenStatus('takeaway', false, false)).toBe('completed')
  })

  it('maps kitchen lines to preparing', () => {
    expect(orderTypeToKitchenStatus('dine_in', false, true)).toBe('preparing')
    expect(orderTypeToKitchenStatus('delivery', false, true)).toBe('preparing')
  })
})

describe('orderTypeToStatus', () => {
  it('maps hold to pending', () => {
    expect(orderTypeToStatus('dine_in', true, true)).toBe('pending')
  })

  it('maps ready-only to delivered', () => {
    expect(orderTypeToStatus('takeaway', false, false)).toBe('delivered')
  })

  it('maps kitchen dine-in/takeaway to preparing', () => {
    expect(orderTypeToStatus('dine_in', false, true)).toBe('preparing')
    expect(orderTypeToStatus('takeaway', false, true)).toBe('preparing')
  })

  it('maps kitchen delivery to confirmed', () => {
    expect(orderTypeToStatus('delivery', false, true)).toBe('confirmed')
  })
})

describe('effectiveKitchenLane', () => {
  it('prefers kitchen_status over status', () => {
    expect(
      effectiveKitchenLane({ status: 'delivered', kitchen_status: 'preparing' }),
    ).toBe('preparing')
    expect(
      effectiveKitchenLane({ status: 'preparing', kitchen_status: 'ready' }),
    ).toBe('ready')
  })

  it('falls back to marketplace status', () => {
    expect(effectiveKitchenLane({ status: 'ready', kitchen_status: null })).toBe('ready')
  })
})

describe('classifyCheckoutError', () => {
  it('surfaces missing column name from schema cache errors', () => {
    const r = classifyCheckoutError(
      "Could not find the 'kitchen_status' column of 'orders' in the schema cache",
      false,
    )
    expect(r.retryable).toBe(false)
    expect(r.error).toBe('Missing column orders.kitchen_status. Sale was not saved.')
  })

  it('marks network errors as retryable', () => {
    expect(classifyCheckoutError('Failed to fetch', false).retryable).toBe(true)
  })
})
