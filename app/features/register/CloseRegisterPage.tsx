import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuthStore } from '@/app/stores/authStore'
import { useRegisterStore } from '@/app/stores/registerStore'
import { Button } from '@/app/components/ui/button'
import { formatCurrency } from '@/lib/checkout/format'
import { expectedCashFromSession } from '@/lib/register/types'

export function CloseRegisterPage() {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const session = useRegisterStore((s) => s.session)
  const close = useRegisterStore((s) => s.close)
  const loading = useRegisterStore((s) => s.loading)
  const error = useRegisterStore((s) => s.error)
  const clearError = useRegisterStore((s) => s.clearError)

  const expected = useMemo(
    () => (session ? expectedCashFromSession(session) : 0),
    [session],
  )
  const [countedText, setCountedText] = useState(String(expected))
  const [note, setNote] = useState('')

  const counted = Math.max(0, Number(countedText.replace(/,/g, '')) || 0)
  const variance = Math.round((counted - expected + Number.EPSILON) * 100) / 100
  const totals = session?.totals_json

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
        No open register. Open a till to start selling.
        <Button className="ml-3" onClick={() => navigate('/register/open')}>
          Open register
        </Button>
      </div>
    )
  }

  const handleClose = async () => {
    if (!profile?.id) return
    clearError()
    const ok = await close({
      vendorId: profile.id,
      countedCash: counted,
      closingNote: note.trim() || undefined,
      actorId: profile.id,
    })
    if (ok) navigate('/register/open', { replace: true })
  }

  return (
    <div className="mx-auto flex h-full max-w-lg flex-col gap-6 overflow-y-auto p-6">
      <div>
        <h1 className="text-2xl font-semibold">Close register</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {session.terminal_name} · {session.cashier_name}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
        <div>
          <p className="text-muted-foreground">Opening float</p>
          <p className="font-semibold">{formatCurrency(session.opening_float)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Sales</p>
          <p className="font-semibold">{totals?.sales_count ?? 0}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Cash sales</p>
          <p className="font-semibold">{formatCurrency(totals?.cash ?? 0)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Card</p>
          <p className="font-semibold">{formatCurrency(totals?.card ?? 0)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Transfer</p>
          <p className="font-semibold">{formatCurrency(totals?.transfer ?? 0)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Wallet</p>
          <p className="font-semibold">{formatCurrency(totals?.wallet ?? 0)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Expected cash in drawer</p>
        <p className="text-3xl font-bold">{formatCurrency(expected)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Float + cash sales − cash refunds
        </p>
      </div>

      <div>
        <label
          htmlFor="counted-cash"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Counted cash
        </label>
        <input
          id="counted-cash"
          inputMode="decimal"
          value={countedText}
          onChange={(e) => setCountedText(e.target.value.replace(/[^\d.]/g, ''))}
          className="mt-1 w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm"
        />
        <p
          className={`mt-2 text-sm font-medium ${
            variance === 0 ? 'text-success' : 'text-destructive'
          }`}
        >
          Variance: {formatCurrency(variance)}
        </p>
      </div>

      <div>
        <label
          htmlFor="closing-note"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Closing note {variance !== 0 ? '(recommended)' : '(optional)'}
        </label>
        <input
          id="closing-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1 w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm"
          placeholder="Explain variance if any…"
        />
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <Button
        type="button"
        disabled={loading}
        onClick={() => void handleClose()}
        className="w-full rounded-2xl bg-primary py-6 text-sm font-semibold text-primary-foreground"
      >
        {loading ? 'Closing…' : 'Close till & lock'}
      </Button>
    </div>
  )
}
