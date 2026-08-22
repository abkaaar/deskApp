import { useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'

import { useAuthStore } from '@/app/stores/authStore'

import { useCheckoutStore } from '../checkoutStore'

function formatClock(date: Date): string {
  return date.toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function CheckoutHeader() {
  const profile = useAuthStore((s) => s.profile)
  const resetSale = useCheckoutStore((s) => s.resetSale)
  const [clock, setClock] = useState(() => formatClock(new Date()))

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(formatClock(new Date()))
    }, 30_000)
    return () => window.clearInterval(timer)
  }, [])

  
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-border bg-background px-4 py-3">
      <div>
        <p className="text-lg font-semibold uppercase tracking-[0.2em] text-primary">Checkout</p>
      </div>

      <div className="flex items-center gap-3">
        <p className="text-sm font-medium text-muted-foreground">{clock}</p>
        <button
          type="button"
          onClick={resetSale}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
        >
          <RotateCcw className="h-4 w-4" />
          New sale
        </button>
      </div>
    </header>
  )
}
