import { AlertTriangle, Boxes, ClipboardCheck, PackageSearch, Trash2 } from 'lucide-react'

const CAPABILITIES = [
  { icon: Boxes, label: 'Ledger on-hand' },
  { icon: PackageSearch, label: 'Purchases & returns' },
  { icon: Trash2, label: 'Waste & spoilage' },
  { icon: ClipboardCheck, label: 'Stock counts' },
] as const

export function InventoryBanner() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-muted/60 p-2">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Kitchen ledger is the source of truth
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Track items with in / out / adjust / count movements. Menu stock is only a sellable cache
            for linked finished products — not your kitchen inventory. Unlinked menu items keep a
            separate menu sellable count.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {CAPABILITIES.map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground"
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
