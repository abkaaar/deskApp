import { useState } from 'react'

import { formatCurrency } from '@/lib/checkout/format'
import type { MenuAddon } from '@/lib/checkout/types'
import { cn } from '@/lib/utils'

type AddonPickerDialogProps = {
  itemTitle: string
  basePrice: number
  addons: MenuAddon[]
  onDismiss: () => void
  onConfirm: (selected: MenuAddon[]) => void
}

export function AddonPickerDialog({
  itemTitle,
  basePrice,
  addons,
  onDismiss,
  onConfirm,
}: AddonPickerDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-[20px] border border-border bg-card shadow-xl">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-lg font-bold">Extras for {itemTitle}</h3>
          <p className="mt-1 text-sm text-muted-foreground">Base {formatCurrency(basePrice)}</p>
        </div>
        <div className="max-h-[50vh] space-y-1 overflow-y-auto px-3 py-2">
          {addons.map((addon) => {
            const checked = selected.has(addon.id)
            return (
              <label
                key={addon.id}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 hover:bg-muted',
                  checked && 'bg-muted',
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(addon.id)}
                  className="h-4 w-4 rounded border-border"
                />
                <span className="flex-1 text-sm font-medium">{addon.title}</span>
                <span className="text-sm text-muted-foreground">
                  +{formatCurrency(addon.price)}
                </span>
              </label>
            )
          })}
        </div>
        <div className="flex gap-2 border-t border-border p-4">
          <button
            type="button"
            onClick={onDismiss}
            className="flex-1 rounded-full py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(addons.filter((a) => selected.has(a.id)))}
            className="flex-[1.4] rounded-full bg-primary py-2.5 text-sm font-bold text-primary-foreground"
          >
            Add to order
          </button>
        </div>
      </div>
    </div>
  )
}
