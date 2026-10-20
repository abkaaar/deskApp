import { useCallback, useEffect, useRef, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { toast } from 'sonner'

import { useAuthStore } from '@/app/stores/authStore'
import { formatCurrency } from '@/lib/checkout/format'
import {
  deleteHeldCart,
  HOLDS_CHANGED_EVENT,
  listHeldCarts,
  type HeldCartView,
} from '@/lib/checkout/heldCarts'
import { cn } from '@/lib/utils'

import { useCheckoutStore } from '../checkoutStore'

type HeldOrdersPanelProps = {
  onResumed?: () => void
}

export function HeldOrdersPanel({ onResumed }: HeldOrdersPanelProps) {
  const profile = useAuthStore((s) => s.profile)
  const cart = useCheckoutStore((s) => s.cart)
  const restoreHeldSale = useCheckoutStore((s) => s.restoreHeldSale)
  const [holds, setHolds] = useState<HeldCartView[]>([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!profile?.id) {
      setHolds([])
      return
    }
    setLoading(true)
    try {
      setHolds(await listHeldCarts(profile.id))
    } catch {
      setHolds([])
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onChange = () => {
      void load()
    }
    window.addEventListener(HOLDS_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(HOLDS_CHANGED_EVENT, onChange)
  }, [load])

  useEffect(() => {
    if (!open) return
    void load()
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, load])

  const resume = async (hold: HeldCartView) => {
    if (!profile?.id || busyId) return
    if (cart.length > 0) {
      toast.error('Clear or hold the current cart before resuming')
      return
    }
    setBusyId(hold.id)
    try {
      const ok = restoreHeldSale(hold.payload)
      if (!ok) {
        toast.error('Could not restore held cart')
        return
      }
      await deleteHeldCart(hold.id, profile.id)
      toast.success('Held cart resumed')
      setOpen(false)
      onResumed?.()
      await load()
    } finally {
      setBusyId(null)
    }
  }

  const discard = async (hold: HeldCartView) => {
    if (!profile?.id || busyId) return
    setBusyId(hold.id)
    try {
      await deleteHeldCart(hold.id, profile.id)
      toast.success('Held cart discarded')
      await load()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-muted',
          open && 'bg-muted',
        )}
      >
        <ClipboardList className="h-4 w-4" />
        Held
        {holds.length > 0 && (
          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
            {holds.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Held carts</p>
            <button
              type="button"
              onClick={() => void load()}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Refresh
            </button>
          </div>
          <p className="mb-2 text-[11px] text-muted-foreground">
            Holds park the cart locally. No order is created until you pay.
          </p>
          {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {!loading && holds.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">No held carts</p>
          )}
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {holds.map((hold) => (
              <li
                key={hold.id}
                className="rounded-xl border border-border bg-muted/40 px-3 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-muted-foreground">
                      {hold.label || `#${String(hold.id).slice(0, 8)}`}
                    </p>
                    <p className="text-sm font-semibold">
                      {formatCurrency(hold.total)} · {hold.itemCount} items
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1">
                    <button
                      type="button"
                      disabled={busyId === hold.id}
                      onClick={() => void resume(hold)}
                      className={cn(
                        'rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase text-primary-foreground',
                        busyId === hold.id && 'opacity-50',
                      )}
                    >
                      Resume
                    </button>
                    <button
                      type="button"
                      disabled={busyId === hold.id}
                      onClick={() => void discard(hold)}
                      className={cn(
                        'rounded-full border border-border px-2.5 py-1 text-[10px] font-bold uppercase',
                        busyId === hold.id && 'opacity-50',
                      )}
                    >
                      Discard
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
