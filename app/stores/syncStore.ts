import { create } from 'zustand'

import {
  flushSaleOutbox,
  getAttentionCount,
  getOutboxCount,
  isBrowserOffline,
} from '@/lib/checkout/saleOutbox'
import { getSupabaseClient } from '@/lib/supabase/client'

const PENDING_FLUSH_MS = 30_000
const FAILURE_BACKOFF_MS = 60_000

export type FlushResult = {
  flushed: number
  remaining: number
  attention: number
  lastError?: string
  online: boolean
}

type SyncState = {
  online: boolean
  pendingCount: number
  attentionCount: number
  flushing: boolean
  lastError: string | null
  refresh: () => void
  /** Probe connectivity, then flush. Pass retryFailed on manual Cloud click. */
  flush: (opts?: { retryFailed?: boolean; probe?: boolean }) => Promise<FlushResult>
  bindBrowserListeners: () => () => void
}

async function probeConnectivity(): Promise<boolean> {
  if (isBrowserOffline()) return false
  try {
    const supabase = getSupabaseClient()
    const { error } = await supabase.from('orders').select('id').limit(1)
    // Any response from the API means we are connected (RLS/empty is fine).
    if (!error) return true
    const msg = (error.message || '').toLowerCase()
    if (
      msg.includes('failed to fetch') ||
      msg.includes('network') ||
      msg.includes('timeout') ||
      msg.includes('offline')
    ) {
      return false
    }
    return true
  } catch {
    return false
  }
}

export const useSyncStore = create<SyncState>((set, get) => ({
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pendingCount: typeof window !== 'undefined' ? getOutboxCount() : 0,
  attentionCount: typeof window !== 'undefined' ? getAttentionCount() : 0,
  flushing: false,
  lastError: null,

  refresh: () => {
    set({
      online: !isBrowserOffline(),
      pendingCount: getOutboxCount(),
      attentionCount: getAttentionCount(),
    })
  },

  flush: async (opts) => {
    if (get().flushing) {
      return {
        flushed: 0,
        remaining: getOutboxCount(),
        attention: getAttentionCount(),
        online: get().online,
        lastError: get().lastError ?? undefined,
      }
    }

    const shouldProbe = opts?.probe !== false
    if (shouldProbe) {
      const reachable = await probeConnectivity()
      if (!reachable) {
        set({
          online: false,
          pendingCount: getOutboxCount(),
          attentionCount: getAttentionCount(),
        })
        return {
          flushed: 0,
          remaining: getOutboxCount(),
          attention: getAttentionCount(),
          online: false,
          lastError: 'Offline — reconnect to sync',
        }
      }
      set({ online: true })
    } else if (isBrowserOffline()) {
      set({ online: false, pendingCount: getOutboxCount(), attentionCount: getAttentionCount() })
      return {
        flushed: 0,
        remaining: getOutboxCount(),
        attention: getAttentionCount(),
        online: false,
        lastError: 'Offline — reconnect to sync',
      }
    }

    set({ flushing: true, lastError: null })
    try {
      const result = await flushSaleOutbox({ retryFailed: opts?.retryFailed })
      set({
        online: true,
        pendingCount: result.remaining,
        attentionCount: result.attention,
        lastError: result.lastError ?? null,
      })
      return { ...result, online: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed'
      set({
        online: !isBrowserOffline(),
        pendingCount: getOutboxCount(),
        attentionCount: getAttentionCount(),
        lastError: message,
      })
      return {
        flushed: 0,
        remaining: getOutboxCount(),
        attention: getAttentionCount(),
        online: !isBrowserOffline(),
        lastError: message,
      }
    } finally {
      set({ flushing: false })
    }
  },

  bindBrowserListeners: () => {
    let intervalId: number | null = null
    let backoffUntil = 0
    let consecutiveFailures = 0

    const clearIntervalSafe = () => {
      if (intervalId != null) {
        window.clearInterval(intervalId)
        intervalId = null
      }
    }

    const scheduleInterval = () => {
      clearIntervalSafe()
      intervalId = window.setInterval(() => {
        const { pendingCount, online, flushing } = get()
        if (!online || flushing || pendingCount <= 0) return
        if (Date.now() < backoffUntil) return
        void get()
          .flush({ probe: true })
          .then((result) => {
            if (result.lastError && result.flushed === 0 && result.remaining > 0) {
              consecutiveFailures += 1
              backoffUntil = Date.now() + FAILURE_BACKOFF_MS * Math.min(consecutiveFailures, 3)
            } else if (result.flushed > 0 || result.remaining === 0) {
              consecutiveFailures = 0
              backoffUntil = 0
            }
          })
      }, PENDING_FLUSH_MS)
    }

    const onOnline = () => {
      set({ online: true })
      consecutiveFailures = 0
      backoffUntil = 0
      void get().flush({ probe: true })
    }
    const onOffline = () => {
      set({
        online: false,
        pendingCount: getOutboxCount(),
        attentionCount: getAttentionCount(),
      })
    }
    const onFocus = () => {
      get().refresh()
      if (!isBrowserOffline()) void get().flush({ probe: true })
    }
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return
      get().refresh()
      if (!isBrowserOffline()) void get().flush({ probe: true })
    }

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    scheduleInterval()
    get().refresh()
    if (!isBrowserOffline()) void get().flush({ probe: true })

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
      clearIntervalSafe()
    }
  },
}))
