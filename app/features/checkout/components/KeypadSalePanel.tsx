import { useState } from 'react'

import { formatCurrency, parseKeypadAmount } from '@/lib/checkout/format'
import { cn } from '@/lib/utils'

import { useCheckoutStore } from '../checkoutStore'
import { Keypad } from './Keypad'

const PRESETS = [500, 1000, 2000, 5000] as const

export function KeypadSalePanel() {
  const customAmount = useCheckoutStore((s) => s.customAmount)
  const customNote = useCheckoutStore((s) => s.customNote)
  const setCustomAmount = useCheckoutStore((s) => s.setCustomAmount)
  const setCustomNote = useCheckoutStore((s) => s.setCustomNote)
  const addCustomAmount = useCheckoutStore((s) => s.addCustomAmount)
  const [showNote, setShowNote] = useState(false)

  const amount = parseKeypadAmount(customAmount)
  const canReview = amount > 0

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <p className="text-5xl font-bold tracking-tight text-foreground">
          {customAmount ? formatCurrency(amount) : '₦0.00'}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setShowNote((v) => !v)}
            className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            {showNote || customNote ? 'Note' : '+ Note'}
          </button>
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setCustomAmount(String(preset))}
              className="rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              {formatCurrency(preset)}
            </button>
          ))}
        </div>

        {(showNote || customNote) && (
          <input
            type="text"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value.slice(0, 48))}
            placeholder="Note (optional)"
            className="h-10 w-full max-w-md rounded-full border border-border bg-card px-3 text-sm text-foreground outline-none ring-primary focus:ring-2"
          />
        )}
      </div>

      <div className="mx-auto w-full max-w-md">
        <Keypad value={customAmount} onChange={setCustomAmount} showDecimal />
      </div>

      <button
        type="button"
        disabled={!canReview}
        onClick={() => {
          addCustomAmount(customNote, amount)
          setShowNote(false)
        }}
        className={cn(
          'h-13 w-full rounded-full text-sm font-bold transition',
          canReview
            ? 'bg-primary py-3.5 text-primary-foreground hover:bg-primary/90'
            : 'cursor-not-allowed bg-muted py-3.5 text-muted-foreground',
        )}
      >
        Review sale
      </button>
    </section>
  )
}
