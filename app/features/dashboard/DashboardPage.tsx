import {
  Banknote,
  Bike,
  ChefHat,
  Clock3,
  RefreshCw,
  ShoppingBag,
  Store,
  Users,
  Wallet,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/app/components/ui/button'
import { useAuthStore } from '@/app/stores/authStore'
import { formatCurrency } from '@/lib/checkout/format'
import { cn } from '@/lib/utils'

import { useVendorDashboard } from './hooks/useVendorDashboard'

type Widget = {
  key: string
  label: string
  value: string
  hint?: string
  icon: typeof Wallet
  accent?: string
  to?: string
}

export function DashboardPage() {
  const profile = useAuthStore((s) => s.profile)
  const { stats, loading, refreshing, error, refresh } = useVendorDashboard()

  const businessName =
    profile?.business_name || profile?.name || profile?.username || 'your restaurant'

  const widgets: Widget[] = [
    {
      key: 'revenue',
      label: "Today's Revenue",
      value: formatCurrency(stats.todaysRevenue),
      hint: 'Paid & completed sales',
      icon: Wallet,
      accent: 'text-primary',
    },
    {
      key: 'orders',
      label: 'Orders Today',
      value: String(stats.ordersToday),
      hint: 'Walk-in + online',
      icon: ShoppingBag,
      to: '/orders',
    },
    {
      key: 'walkin',
      label: 'Walk-in Orders',
      value: String(stats.walkInOrders),
      hint: 'POS / in-person',
      icon: Store,
      to: '/checkout',
    },
    {
      key: 'online',
      label: 'Online Orders',
      value: String(stats.onlineOrders),
      hint: 'Foodma storefront',
      icon: ShoppingBag,
      to: '/orders',
    },
    {
      key: 'kitchen',
      label: 'Pending Kitchen Orders',
      value: String(stats.pendingKitchenOrders),
      hint: 'Confirmed & preparing',
      icon: ChefHat,
      accent: stats.pendingKitchenOrders > 0 ? 'text-warning' : undefined,
      to: '/kitchen',
    },
    {
      key: 'delivery',
      label: 'Active Deliveries',
      value: String(stats.activeDeliveries),
      hint: 'Out for delivery',
      icon: Bike,
      to: '/delivery',
    },
    {
      key: 'customers',
      label: 'Customers Served',
      value: String(stats.customersServed),
      hint: 'Unique guests today',
      icon: Users,
      to: '/customers',
    },
    {
      key: 'aov',
      label: 'Average Order Value',
      value: formatCurrency(stats.averageOrderValue),
      hint: 'Revenue ÷ orders today',
      icon: Wallet,
    },
    {
      key: 'peak',
      label: 'Peak Hour',
      value: stats.peakHour ?? '—',
      hint: stats.peakHour ? 'Busiest hour today' : 'No orders yet today',
      icon: Clock3,
    },
    {
      key: 'drawer',
      label: 'Cash Drawer Status',
      value: stats.cashDrawer.status === 'open' ? 'Open' : 'Idle',
      hint:
        stats.cashDrawer.transactionCount > 0
          ? `${formatCurrency(stats.cashDrawer.cashCollected)} cash · ${stats.cashDrawer.transactionCount} txns`
          : 'No cash sales yet today',
      icon: Banknote,
      accent: stats.cashDrawer.status === 'open' ? 'text-success' : undefined,
      to: '/transactions',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
            Command center
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Today&apos;s business at {businessName}.
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => void refresh()}
          disabled={refreshing}
          aria-label="Refresh dashboard"
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading today&apos;s numbers...</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {widgets.map((widget) => {
            const content = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs text-muted-foreground">{widget.label}</p>
                  <widget.icon
                    className={cn('h-4 w-4 shrink-0 text-muted-foreground', widget.accent)}
                  />
                </div>
                <p className={cn('mt-2 text-2xl font-semibold tracking-tight', widget.accent)}>
                  {widget.value}
                </p>
                {widget.hint && (
                  <p className="mt-1 text-xs text-muted-foreground">{widget.hint}</p>
                )}
              </>
            )

            const className = cn(
              'rounded-xl border border-border bg-card p-4 text-left transition',
              widget.to && 'hover:border-primary/40 hover:bg-primary-bg/30',
            )

            if (widget.to) {
              return (
                <Link key={widget.key} to={widget.to} className={className}>
                  {content}
                </Link>
              )
            }

            return (
              <div key={widget.key} className={className}>
                {content}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
