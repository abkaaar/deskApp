import { useEffect, useState } from 'react'

import { formatCurrency } from '@/lib/checkout/format'
import type { CustomerDisplayState } from '@/lib/shared/customerDisplay'
import { APP_CONFIG } from '@/lib/shared/config'

const IDLE_STATE: CustomerDisplayState = {
  lines: [],
  orderType: 'takeaway',
  tableLabel: null,
  customerName: null,
  subtotal: 0,
  discount: 0,
  total: 0,
  itemCount: 0,
  phase: 'idle',
  thankYouMessage: null,
}

function orderTypeLabel(value: string): string {
  if (value === 'dine_in') return 'Dine in'
  if (value === 'delivery') return 'Delivery'
  return 'Takeaway'
}

export function CustomerDisplayPage() {
  const [state, setState] = useState<CustomerDisplayState>(IDLE_STATE)

  useEffect(() => {
    return window.api.customerDisplay.onState(setState)
  }, [])

  if (state.phase === 'paid') {
    return (
      <div className="flex h-full min-h-screen flex-col items-center justify-center bg-zinc-950 px-8 text-center text-white">
        <p className="text-5xl font-semibold tracking-tight md:text-6xl">Thank you</p>
        <p className="mt-4 text-2xl text-zinc-300 md:text-3xl">
          {state.thankYouMessage || 'Payment received'}
        </p>
        {state.total > 0 && (
          <p className="mt-8 text-4xl font-bold text-emerald-400 md:text-5xl">
            {formatCurrency(state.total)}
          </p>
        )}
      </div>
    )
  }

  if (state.phase === 'idle' || state.itemCount === 0) {
    return (
      <div className="flex h-full min-h-screen flex-col items-center justify-center bg-zinc-950 px-8 text-center text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">{APP_CONFIG.name}</p>
        <p className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">Welcome</p>
        <p className="mt-3 max-w-lg text-xl text-zinc-400">
          Your order will appear here
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-screen flex-col bg-zinc-950 text-white">
      <header className="flex items-center justify-between border-b border-zinc-800 px-8 py-5">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">{APP_CONFIG.name}</p>
          <p className="mt-1 text-2xl font-semibold">{orderTypeLabel(state.orderType)}</p>
        </div>
        <div className="text-right text-lg text-zinc-300">
          {state.tableLabel && <p>Table {state.tableLabel}</p>}
          {state.customerName && <p>{state.customerName}</p>}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <ul className="space-y-4">
          {state.lines.map((line, index) => (
            <li
              key={`${line.title}-${index}`}
              className="flex items-start justify-between gap-6 border-b border-zinc-900 pb-4"
            >
              <div className="min-w-0">
                <p className="text-2xl font-medium leading-snug md:text-3xl">{line.title}</p>
                <p className="mt-1 text-lg text-zinc-400">
                  {line.quantity} × {formatCurrency(line.unitPrice)}
                </p>
              </div>
              <p className="shrink-0 text-2xl font-semibold tabular-nums md:text-3xl">
                {formatCurrency(line.subtotal)}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <footer className="border-t border-zinc-800 bg-zinc-900/80 px-8 py-6">
        <div className="space-y-2 text-xl md:text-2xl">
          <div className="flex justify-between text-zinc-300">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatCurrency(state.subtotal)}</span>
          </div>
          {state.discount > 0 && (
            <div className="flex justify-between text-zinc-300">
              <span>Discount</span>
              <span className="tabular-nums">−{formatCurrency(state.discount)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 text-3xl font-bold md:text-4xl">
            <span>Total</span>
            <span className="tabular-nums text-emerald-400">{formatCurrency(state.total)}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
