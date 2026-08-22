import { AlertTriangle, Boxes, Coins, Trash2 } from 'lucide-react'

import { Card, CardContent } from '@/app/components/ui/card'
import type { InventoryAnalytics } from '@/lib/types/inventory'

function formatNaira(amount: number) {
  return `₦${Math.round(amount).toLocaleString('en-NG')}`
}

type InventoryAnalyticsCardsProps = {
  analytics: InventoryAnalytics | null
  loading?: boolean
}

export function InventoryAnalyticsCards({ analytics, loading }: InventoryAnalyticsCardsProps) {
  const cards = [
    {
      icon: Coins,
      label: 'On-hand valuation',
      value: analytics ? formatNaira(analytics.on_hand_valuation) : '—',
      hint: 'qty × cost from ledger',
    },
    {
      icon: AlertTriangle,
      label: 'Low / out of stock',
      value: analytics
        ? `${analytics.low_stock_count} low · ${analytics.out_of_stock_count} out`
        : '—',
      hint: `${analytics?.open_alerts ?? 0} open alerts`,
    },
    {
      icon: Trash2,
      label: 'Waste & spoilage',
      value: analytics ? formatNaira(analytics.waste_value) : '—',
      hint: analytics
        ? `${analytics.waste_quantity} units · last ${analytics.period_days}d`
        : 'Last 30 days',
    },
    {
      icon: Boxes,
      label: 'Count variance',
      value: analytics ? String(analytics.stock_count_variance_abs) : '—',
      hint: 'Abs. stock-count deltas',
    },
  ] as const

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ icon: Icon, label, value, hint }) => (
        <Card key={label} className="border-border/80">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="rounded-xl bg-muted/60 p-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 truncate text-lg font-semibold text-foreground">
                {loading ? '…' : value}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
