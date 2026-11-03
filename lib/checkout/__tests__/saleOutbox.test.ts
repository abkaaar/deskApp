import { beforeEach, describe, expect, it, vi } from 'vitest'

const createPosOrderFromCart = vi.fn()
const recordRegisterSale = vi.fn()
const memory = new Map<string, string>()

vi.stubGlobal('localStorage', {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value)
  },
  removeItem: (key: string) => {
    memory.delete(key)
  },
  clear: () => memory.clear(),
  key: () => null,
  get length() {
    return memory.size
  },
})

vi.mock('../posCheckoutService', () => ({
  createPosOrderFromCart: (...args: unknown[]) => createPosOrderFromCart(...args),
}))

vi.mock('@/lib/register/registerSessionService', () => ({
  recordRegisterSale: (...args: unknown[]) => recordRegisterSale(...args),
}))

import {
  enqueueOfflineSale,
  flushSaleOutbox,
  getAttentionCount,
  getFailedSales,
  getOutboxCount,
  retryFailedSales,
} from '../saleOutbox'
import type { CreatePosOrderPayload } from '../types'

const OUTBOX_KEY = 'foodma_desktop_sale_outbox_v1'
const FAILED_KEY = 'foodma_desktop_sale_outbox_failed_v1'

function basePayload(overrides: Partial<CreatePosOrderPayload> = {}): CreatePosOrderPayload {
  return {
    vendorId: 'vendor-1',
    buyerId: 'vendor-1',
    orderType: 'takeaway',
    paymentMethod: 'cash',
    lineItems: [
      {
        post_id: '11111111-1111-1111-1111-111111111111',
        quantity: 1,
        unit_price: 500,
        subtotal: 500,
        title: 'Water',
      },
    ],
    subtotal: 500,
    total: 500,
    totalQuantity: 1,
    registerSessionId: 'reg-1',
    ...overrides,
  }
}

describe('saleOutbox', () => {
  beforeEach(() => {
    localStorage.clear()
    createPosOrderFromCart.mockReset()
    recordRegisterSale.mockReset()
    recordRegisterSale.mockResolvedValue(null)
  })

  it('enqueues with posExternalId fallback', () => {
    const entry = enqueueOfflineSale(basePayload({ posExternalId: null }))
    expect(entry.payload.posExternalId).toBe(entry.id)
    expect(getOutboxCount()).toBe(1)
  })

  it('flushes success and records register sale', async () => {
    enqueueOfflineSale(basePayload({ posExternalId: 'ext-1' }))
    createPosOrderFromCart.mockResolvedValue({
      success: true,
      orderId: '99',
      ledgerSynced: true,
    })

    const result = await flushSaleOutbox()
    expect(result.flushed).toBe(1)
    expect(result.remaining).toBe(0)
    expect(getOutboxCount()).toBe(0)
    expect(recordRegisterSale).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'reg-1',
        orderId: '99',
        method: 'cash',
        amount: 500,
      }),
    )
  })

  it('treats Sale already synced as flushed', async () => {
    enqueueOfflineSale(basePayload({ posExternalId: 'ext-2' }))
    createPosOrderFromCart.mockResolvedValue({
      success: false,
      error: 'Sale already synced',
      orderId: '88',
    })

    const result = await flushSaleOutbox()
    expect(result.flushed).toBe(1)
    expect(getOutboxCount()).toBe(0)
  })

  it('keeps retryable failures in pending', async () => {
    enqueueOfflineSale(basePayload({ posExternalId: 'ext-3' }))
    createPosOrderFromCart.mockResolvedValue({
      success: false,
      error: 'Network error',
      retryable: true,
      ledgerSynced: false,
      orderId: '77',
    })

    const result = await flushSaleOutbox()
    expect(result.flushed).toBe(0)
    expect(result.remaining).toBe(1)
    expect(getAttentionCount()).toBe(0)
  })

  it('parks non-retryable failures in attention queue', async () => {
    enqueueOfflineSale(basePayload({ posExternalId: 'ext-4' }))
    createPosOrderFromCart.mockResolvedValue({
      success: false,
      error: 'Only 0 left in stock',
      retryable: false,
      ledgerSynced: false,
    })

    const result = await flushSaleOutbox()
    expect(result.flushed).toBe(0)
    expect(result.remaining).toBe(0)
    expect(result.attention).toBe(1)
    expect(getFailedSales()[0]?.lastError).toMatch(/stock/i)
  })

  it('retryFailedSales moves attention back to pending', async () => {
    localStorage.setItem(
      FAILED_KEY,
      JSON.stringify([
        {
          id: 'f1',
          createdAt: new Date().toISOString(),
          payload: basePayload({ posExternalId: 'ext-5' }),
          lastError: 'boom',
        },
      ]),
    )
    expect(retryFailedSales()).toBe(1)
    expect(getAttentionCount()).toBe(0)
    expect(getOutboxCount()).toBe(1)
    expect(localStorage.getItem(OUTBOX_KEY)).toContain('ext-5')
  })
})
