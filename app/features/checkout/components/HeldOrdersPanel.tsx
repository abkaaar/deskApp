import { useCallback, useEffect, useRef, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { toast } from 'sonner'

import { useAuthStore } from '@/app/stores/authStore'
import { formatCurrency } from '@/lib/checkout/format'
import { isHeldPosOrder, parsePosNotes } from '@/lib/checkout/pos-order'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Order } from '@/lib/types/order'
import { cn } from '@/lib/utils'

type HeldOrdersPanelProps = {
  onResumePaid?: () => void
}

export function HeldOrdersPanel({ onResumePaid }: HeldOrdersPanelProps) {
  const profile = useAuthStore((s) => s.profile)
  const [holds, setHolds] = useState<Order[]>([])
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
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('vendor_id', profile.id)
        .eq('payment_status', 'pending')
        .eq('source', 'pos')
        .order('created_at', { ascending: false })
        .limit(30)
      if (error) throw error
      setHolds((data as Order[]).filter(isHeldPosOrder))
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

  const settle = async (order: Order, method: 'cash' | 'card' | 'transfer' | 'wallet') => {
    if (!profile?.id || busyId) return
    setBusyId(order.id)
    try {
      const supabase = getSupabaseClient()
      const meta = parsePosNotes(order.notes)
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          status: meta?.orderType === 'delivery' ? 'confirmed' : 'delivered',
          paid_at: now,
          confirmed_at: now,
          delivered_at: meta?.orderType === 'delivery' ? null : now,
          notes: JSON.stringify({
            ...(meta ?? { type: 'pos', orderType: 'takeaway', paymentMethod: method }),
            paymentMethod: method,
            held: false,
          }),
        })
        .eq('id', order.id)
        .eq('vendor_id', profile.id)

      if (error) {
        toast.error(error.message || 'Could not settle hold')
        return
      }

      toast.success('Held order paid')
      onResumePaid?.()
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
        Held orders
        {holds.length > 0 && (
          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
            {holds.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Held orders</p>
            <button
              type="button"
              onClick={() => void load()}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Refresh
            </button>
          </div>
          {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {!loading && holds.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">No held orders</p>
          )}
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {holds.map((order) => (
              <li
                key={order.id}
                className="rounded-xl border border-border bg-muted/40 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium">#{order.id.slice(0, 8)}</p>
                    <p className="text-sm font-semibold">
                      {formatCurrency(Number(order.total) || 0)}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    {(['cash', 'card', 'transfer', 'wallet'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        disabled={busyId === order.id}
                        onClick={() => void settle(order, m)}
                        className={cn(
                          'rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase text-primary-foreground',
                          busyId === order.id && 'opacity-50',
                        )}
                      >
                        {m}
                      </button>
                    ))}
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
