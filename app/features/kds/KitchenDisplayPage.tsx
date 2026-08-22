import { ChefHat, RefreshCw } from 'lucide-react'

import { Button } from '@/app/components/ui/button'
import type { Order, OrderStatus } from '@/lib/types/order'
import { cn } from '@/lib/utils'

import { KdsTicketCard } from './components/KdsTicketCard'
import { useKitchenOrders } from './hooks/useKitchenOrders'

type KdsColumnProps = {
  title: string
  count: number
  tone: 'preparing' | 'ready' | 'completed'
  orders: Order[]
  updatingIds: Set<string>
  flashIds: Set<string>
  onBump: (order: Order, nextStatus: OrderStatus) => Promise<{ success: boolean }>
}

function KdsColumn({ title, count, tone, orders, updatingIds, flashIds, onBump }: KdsColumnProps) {
  return (
    <section className="flex min-h-0 flex-col rounded-2xl border border-border bg-muted/30">
      <header
        className={cn(
          'flex items-center justify-between border-b border-border px-4 py-3',
          tone === 'preparing' && 'bg-warning/10',
          tone === 'ready' && 'bg-success/10',
          tone === 'completed' && 'bg-muted',
        )}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">{title}</h2>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs font-bold text-foreground">
          {count}
        </span>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {orders.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">No tickets</p>
        ) : (
          orders.map((order) => (
            <KdsTicketCard
              key={order.id}
              order={order}
              updating={updatingIds.has(String(order.id))}
              flash={flashIds.has(String(order.id))}
              onBump={onBump}
            />
          ))
        )}
      </div>
    </section>
  )
}

export function KitchenDisplayPage() {
  const { columns, loading, refreshing, error, refresh, bumpOrder, updatingIds, flashIds } =
    useKitchenOrders()

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <ChefHat className="h-6 w-6" />
            Kitchen display
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bump tickets from preparing to ready to complete.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={refreshing}
          onClick={() => void refresh()}
          className="gap-2 rounded-full"
        >
          <RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          Refresh
        </Button>
      </div>

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading kitchen tickets…</p>
      ) : (
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-3">
          <KdsColumn
            title="Preparing"
            count={columns.preparing.length}
            tone="preparing"
            orders={columns.preparing}
            updatingIds={updatingIds}
            flashIds={flashIds}
            onBump={bumpOrder}
          />
          <KdsColumn
            title="Ready"
            count={columns.ready.length}
            tone="ready"
            orders={columns.ready}
            updatingIds={updatingIds}
            flashIds={flashIds}
            onBump={bumpOrder}
          />
          <KdsColumn
            title="Completed"
            count={columns.completed.length}
            tone="completed"
            orders={columns.completed}
            updatingIds={updatingIds}
            flashIds={flashIds}
            onBump={bumpOrder}
          />
        </div>
      )}
    </div>
  )
}
