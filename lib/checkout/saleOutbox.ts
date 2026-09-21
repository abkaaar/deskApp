import type { CreatePosOrderPayload, PosOrderResult } from './types'
import { createPosOrderFromCart } from './posCheckoutService'

const OUTBOX_KEY = 'foodma_desktop_sale_outbox_v1'
const FAILED_KEY = 'foodma_desktop_sale_outbox_failed_v1'

export type OutboxSale = {
  id: string
  createdAt: string
  payload: CreatePosOrderPayload
  lastError?: string
}

function readQueue(key: string): OutboxSale[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as OutboxSale[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(key: string, items: OutboxSale[]) {
  localStorage.setItem(key, JSON.stringify(items))
}

export function getOutboxCount(): number {
  return readQueue(OUTBOX_KEY).length
}

export function getAttentionCount(): number {
  return readQueue(FAILED_KEY).length
}

export function getFailedSales(): OutboxSale[] {
  return readQueue(FAILED_KEY)
}

/** Move a failed sale back to the pending queue for another attempt. */
export function retryFailedSales(): number {
  const failed = readQueue(FAILED_KEY)
  if (failed.length === 0) return 0
  const pending = [...readQueue(OUTBOX_KEY), ...failed.map(({ lastError: _, ...rest }) => rest)]
  writeQueue(OUTBOX_KEY, pending)
  writeQueue(FAILED_KEY, [])
  return failed.length
}

export function enqueueOfflineSale(payload: CreatePosOrderPayload): OutboxSale {
  const id = crypto.randomUUID()
  const entry: OutboxSale = {
    id,
    createdAt: new Date().toISOString(),
    payload: { ...payload, posExternalId: payload.posExternalId || id },
  }
  const next = [...readQueue(OUTBOX_KEY), entry]
  writeQueue(OUTBOX_KEY, next)
  return entry
}

export function isBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

/**
 * Flush queued sales to Supabase.
 * - Success / idempotent duplicate → remove from pending
 * - Retryable (network) → keep in pending
 * - Non-retryable (stock/schema) → park in failed queue (never silent-delete)
 */
export async function flushSaleOutbox(options?: {
  retryFailed?: boolean
}): Promise<{
  flushed: number
  remaining: number
  attention: number
  lastError?: string
}> {
  if (options?.retryFailed) {
    retryFailedSales()
  }

  const queue = readQueue(OUTBOX_KEY)
  if (queue.length === 0) {
    return {
      flushed: 0,
      remaining: 0,
      attention: getAttentionCount(),
    }
  }

  const remaining: OutboxSale[] = []
  const newlyFailed: OutboxSale[] = [...readQueue(FAILED_KEY)]
  let flushed = 0
  let lastError: string | undefined

  for (const item of queue) {
    try {
      const result: PosOrderResult = await createPosOrderFromCart({
        ...item.payload,
        posExternalId: item.payload.posExternalId || item.id,
      })
      if (result.success && result.orderId) {
        flushed += 1
      } else if (result.error === 'Sale already synced') {
        // Classifier fallback if insert race was not re-resolved to an id.
        flushed += 1
      } else if (result.retryable) {
        lastError = result.error || 'Failed to sync offline sale'
        remaining.push({ ...item, lastError })
      } else {
        // Needs cashier attention — do not silently drop paid cash sales.
        lastError = result.error || 'Failed to sync offline sale'
        newlyFailed.push({ ...item, lastError })
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Failed to sync offline sale'
      remaining.push({ ...item, lastError })
    }
  }

  writeQueue(OUTBOX_KEY, remaining)
  writeQueue(FAILED_KEY, newlyFailed)
  return {
    flushed,
    remaining: remaining.length,
    attention: newlyFailed.length,
    lastError,
  }
}
