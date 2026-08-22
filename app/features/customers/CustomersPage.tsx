import { useMemo, useState } from 'react'
import { Plus, RefreshCw, Search, Users } from 'lucide-react'

import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'

import { CustomerCard } from './components/CustomerCard'
import { CustomerProfileSheet } from './components/CustomerProfileSheet'
import { CustomerSheet } from './components/CustomerSheet'
import { useVendorCustomers } from './hooks/useVendorCustomers'
import type { VendorCustomer } from '@/lib/types/customer'

function formatMoney(amount: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function CustomersPage() {
  const {
    vendorId,
    customers,
    loading,
    refreshing,
    error,
    stats,
    refresh,
    upsertLocal,
  } = useVendorCustomers()

  const [searchQuery, setSearchQuery] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [editing, setEditing] = useState<VendorCustomer | null>(null)
  const [viewing, setViewing] = useState<VendorCustomer | null>(null)

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return customers
    return customers.filter((customer) =>
      [customer.name, customer.phone, customer.email, customer.address]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    )
  }, [customers, searchQuery])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every guest profile — phone, email, address, orders, and favorites.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => void refresh()}
            disabled={refreshing}
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            onClick={() => {
              setEditing(null)
              setSheetOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add customer
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Customers</p>
          <p className="mt-1 text-2xl font-semibold">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total orders</p>
          <p className="mt-1 text-2xl font-semibold">{stats.totalOrders}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Lifetime spend</p>
          <p className="mt-1 text-2xl font-semibold">{formatMoney(stats.lifetimeSpend)}</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name, phone, email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading customers...</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
          <Users className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">No customers yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Add walk-in guests here. Loyalty, rewards, and promotions will plug into these
            profiles later.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onEdit={(item) => {
                setEditing(item)
                setSheetOpen(true)
              }}
              onView={(item) => {
                setViewing(item)
                setProfileOpen(true)
              }}
            />
          ))}
        </div>
      )}

      <CustomerSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        vendorId={vendorId}
        customer={editing}
        onSaved={upsertLocal}
      />

      <CustomerProfileSheet
        open={profileOpen}
        onOpenChange={setProfileOpen}
        customer={viewing}
        onEdit={(item) => {
          setEditing(item)
          setSheetOpen(true)
        }}
      />
    </div>
  )
}
