import { useMemo, useState } from 'react'
import { ListOrdered, Package, RefreshCw, Search } from 'lucide-react'


import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import { isCompletedOrder, isOngoingOrder } from '@/lib/orders/status'
import type { Order } from '@/lib/types/order'

import { OrderCard } from './components/OrderCard'
import { OrderStatusSheet } from './components/OrderStatusSheet'
import { useVendorOrders } from './hooks/useVendorOrders'

type Tab = 'ongoing' | 'completed'

export function OrdersPage() {
  const {
    orders,
    loading,
    refreshing,
    loadingMore,
    error,
    hasMore,
    refresh,
    loadMore,
    updateOrderInList,
    vendorId,
  } = useVendorOrders()

  const [activeTab, setActiveTab] = useState<Tab>('ongoing')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const onlineOrders = useMemo(
    () => orders.filter((order) => !order.notes?.includes('pos:')),
    [orders],
  )

  const filteredOrders = useMemo(() => {
    let list = onlineOrders.filter((order) =>
      activeTab === 'ongoing' ? isOngoingOrder(order.status) : isCompletedOrder(order.status),
    )

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      list = list.filter((order) => String(order.id).toLowerCase().includes(query))
    }

    return list
  }, [onlineOrders, activeTab, searchQuery])

  const ongoingCount = useMemo(
    () => onlineOrders.filter((order) => isOngoingOrder(order.status)).length,
    [onlineOrders],
  )

  const handleUpdateStatus = (order: Order) => {
    setSelectedOrder(order)
    setSheetOpen(true)
  }

  return (
    <div className="space-y-6">
     <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <ListOrdered className="h-6 w-6" />
            Orders
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Receive storefront and discovery website orders in one place. Accept, prepare, complete, assign delivery.
          </p>
        </div>

        </div>

    

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-border bg-muted p-1">
          <button
            type="button"
            onClick={() => setActiveTab('ongoing')}
            className={
              activeTab === 'ongoing'
                ? 'rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground'
                : 'rounded-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground'
            }
          >
            Ongoing {ongoingCount > 0 ? `(${ongoingCount})` : ''}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={
              activeTab === 'completed'
                ? 'rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground'
                : 'rounded-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground'
            }
          >
            Completed
          </button>
        </div>

        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={refreshing}>
          <RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          Refresh
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search order ID"
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
          Loading orders…
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 p-8 text-center">
            <Package className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium text-foreground">
              {searchQuery
                ? `No orders matching "${searchQuery}"`
                : activeTab === 'ongoing'
                  ? 'No ongoing orders'
                  : 'No completed orders'}
            </p>
            <p className="text-sm text-muted-foreground">
              {activeTab === 'ongoing'
                ? 'New storefront and discovery orders will appear here automatically.'
                : 'Completed and cancelled orders will show up here.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} onUpdateStatus={handleUpdateStatus} />
          ))}
        </div>
      )}

      {hasMore && !loading && filteredOrders.length > 0 && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => void loadMore()} disabled={loadingMore}>
            {loadingMore ? 'Loading more…' : 'Load more orders'}
          </Button>
        </div>
      )}

      <OrderStatusSheet
        order={selectedOrder}
        vendorId={vendorId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onUpdated={updateOrderInList}
      />
    </div>
  )
}
