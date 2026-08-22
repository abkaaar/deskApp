import { useMemo, useState } from 'react'
import { Bike, PackagePlus, RefreshCw, Truck } from 'lucide-react'

import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'
import { formatCurrency } from '@/lib/checkout/format'
import { formatOrderId } from '@/lib/orders/status'
import type { Order } from '@/lib/types/order'

import { AssignDeliverySheet } from './components/AssignDeliverySheet'
import { DeliveryCard } from './components/DeliveryCard'
import { useVendorDeliveries } from './hooks/useVendorDeliveries'

type Tab = 'active' | 'unassigned' | 'completed'

export function DeliveryPage() {
  const {
    vendorId,
    active,
    completed,
    unassignedOrders,
    loading,
    refreshing,
    error,
    busyId,
    refresh,
  } = useVendorDeliveries()

  const [tab, setTab] = useState<Tab>('active')
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignOrder, setAssignOrder] = useState<Order | null>(null)
  const [assignOrderId, setAssignOrderId] = useState<string | null>(null)

  const tabs = useMemo(
    () =>
      [
        { key: 'active' as const, label: 'Active', count: active.length },
        { key: 'unassigned' as const, label: 'Needs assign', count: unassignedOrders.length },
        { key: 'completed' as const, label: 'Completed', count: completed.length },
      ] as const,
    [active.length, unassignedOrders.length, completed.length],
  )

  const openAssign = (order: Order) => {
    setAssignOrder(order)
    setAssignOrderId(String(order.id))
    setAssignOpen(true)
  }

  const openAssignById = (orderId: string) => {
    const fromUnassigned = unassignedOrders.find((o) => String(o.id) === orderId) ?? null
    setAssignOrder(fromUnassigned)
    setAssignOrderId(orderId)
    setAssignOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Delivery</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Assign riders or self-deliver, track status, and keep customers updated in Foodma.
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => void refresh()}
          disabled={refreshing}
          aria-label="Refresh deliveries"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Active</p>
          <p className="mt-1 text-2xl font-semibold">{active.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Needs assignment</p>
          <p className="mt-1 text-2xl font-semibold">{unassignedOrders.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Finding rider</p>
          <p className="mt-1 text-2xl font-semibold">
            {active.filter((d) => d.status === 'pending').length}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <Button
            key={item.key}
            size="sm"
            variant={tab === item.key ? 'default' : 'outline'}
            onClick={() => setTab(item.key)}
          >
            {item.label}
            <Badge variant="secondary" className="ml-2">
              {item.count}
            </Badge>
          </Button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading deliveries...</p>
      ) : tab === 'unassigned' ? (
        unassignedOrders.length === 0 ? (
          <EmptyState
            icon={<PackagePlus className="h-10 w-10 text-muted-foreground" />}
            title="No orders waiting for assignment"
            body="Delivery orders without a rider or self-delivery show up here."
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {unassignedOrders.map((order) => (
              <Card key={order.id} className="border-border/70">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">Order {formatOrderId(String(order.id))}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.buyer?.name || order.buyer?.username || 'Customer'}
                      </p>
                    </div>
                    <Badge variant="outline">{order.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {order.delivery_address || 'No address'} · {formatCurrency(order.total)}
                  </p>
                  <Button className="w-full" onClick={() => openAssign(order)}>
                    <Truck className="mr-2 h-4 w-4" />
                    Assign delivery
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : tab === 'active' ? (
        active.length === 0 ? (
          <EmptyState
            icon={<Bike className="h-10 w-10 text-muted-foreground" />}
            title="No active deliveries"
            body="Request a rider or start self-delivery from Needs assign."
          />
        ) : (
          <div className="space-y-3">
            {active.map((delivery) => (
              <DeliveryCard
                key={delivery.id}
                delivery={delivery}
                vendorId={vendorId}
                busy={busyId === delivery.id || busyId === delivery.order_id}
                onChanged={() => void refresh()}
                onOpenAssign={openAssignById}
              />
            ))}
          </div>
        )
      ) : completed.length === 0 ? (
        <EmptyState
          icon={<Truck className="h-10 w-10 text-muted-foreground" />}
          title="No completed deliveries yet"
          body="Finished and cancelled deliveries appear here."
        />
      ) : (
        <div className="space-y-3">
          {completed.map((delivery) => (
            <DeliveryCard
              key={delivery.id}
              delivery={delivery}
              vendorId={vendorId}
              busy={false}
              onChanged={() => void refresh()}
            />
          ))}
        </div>
      )}

      <AssignDeliverySheet
        open={assignOpen}
        onOpenChange={setAssignOpen}
        vendorId={vendorId}
        order={assignOrder}
        orderIdFallback={assignOrderId}
        onAssigned={() => void refresh()}
      />
    </div>
  )
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="mb-3">{icon}</div>
      <p className="font-medium">{title}</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{body}</p>
    </div>
  )
}
