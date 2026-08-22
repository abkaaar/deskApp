import { useEffect, useMemo, useState } from 'react'

import { CustomerService } from '@/lib/services/customerService'
import { TableService } from '@/lib/services/tableService'
import type { VendorCustomer } from '@/lib/types/customer'
import type { RestaurantTable } from '@/lib/types/table'
import { cn } from '@/lib/utils'

import { useCheckoutStore } from '../checkoutStore'

type CheckoutContextBarProps = {
  vendorId: string | undefined
  showContext: boolean
}

export function CheckoutContextBar({ vendorId, showContext }: CheckoutContextBarProps) {
  const orderType = useCheckoutStore((s) => s.orderType)
  const setOrderType = useCheckoutStore((s) => s.setOrderType)
  const customerName = useCheckoutStore((s) => s.customerName)
  const tableLabel = useCheckoutStore((s) => s.tableLabel)
  const setCustomer = useCheckoutStore((s) => s.setCustomer)
  const setTable = useCheckoutStore((s) => s.setTable)

  const [customerOpen, setCustomerOpen] = useState(false)
  const [tableOpen, setTableOpen] = useState(false)
  const [customers, setCustomers] = useState<VendorCustomer[]>([])
  const [tables, setTables] = useState<RestaurantTable[]>([])

  useEffect(() => {
    if (!vendorId || (!customerOpen && !tableOpen)) return
    let cancelled = false
    void (async () => {
      if (customerOpen) {
        const result = await CustomerService.getCustomers(vendorId)
        if (!cancelled) setCustomers(result.data.filter((c) => c.is_active))
      }
      if (tableOpen) {
        const result = await TableService.getTables(vendorId)
        if (!cancelled) setTables(result.data)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [vendorId, customerOpen, tableOpen])

  const orderTypes = useMemo(
    () =>
      [
        { value: 'dine_in' as const, label: 'Dine in' },
        { value: 'takeaway' as const, label: 'Takeaway' },
        { value: 'delivery' as const, label: 'Delivery' },
      ] as const,
    [],
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {orderTypes.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => setOrderType(type.value)}
            className={cn(
              'rounded-full px-3.5 py-2 text-sm font-medium transition',
              orderType === type.value
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-card text-muted-foreground hover:bg-muted',
            )}
          >
            {type.label}
          </button>
        ))}
      </div>

      {showContext && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCustomerOpen(true)}
            className="rounded-full border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            {customerName || 'Attach customer'}
          </button>
          {orderType === 'dine_in' && (
            <button
              type="button"
              onClick={() => setTableOpen(true)}
              className={cn(
                'rounded-full border px-3.5 py-2 text-sm font-medium transition hover:bg-muted',
                tableLabel
                  ? 'border-border bg-card text-foreground'
                  : 'border-warning/40 bg-warning/10 text-warning',
              )}
            >
              {tableLabel || 'Select table'}
            </button>
          )}
        </div>
      )}

      {customerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-[20px] border border-border bg-card shadow-xl">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-lg font-bold">Attach customer</h3>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              <button
                type="button"
                className="w-full rounded-xl px-3 py-3 text-left text-sm hover:bg-muted"
                onClick={() => {
                  setCustomer(null, null)
                  setCustomerOpen(false)
                }}
              >
                Walk-in (no customer)
              </button>
              {customers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="w-full rounded-xl px-3 py-3 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setCustomer(c.id, c.name || c.phone || 'Customer')
                    setCustomerOpen(false)
                  }}
                >
                  <span className="font-medium">{c.name || 'Unnamed'}</span>
                  {c.phone && (
                    <span className="mt-0.5 block text-xs text-muted-foreground">{c.phone}</span>
                  )}
                </button>
              ))}
              {customers.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No customers yet
                </p>
              )}
            </div>
            <div className="border-t border-border p-3">
              <button
                type="button"
                className="w-full rounded-full py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                onClick={() => setCustomerOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {tableOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-[20px] border border-border bg-card shadow-xl">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-lg font-bold">Select table</h3>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {tables.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="w-full rounded-xl px-3 py-3 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setTable(t.id, t.label)
                    setTableOpen(false)
                  }}
                >
                  <span className="font-medium">{t.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {t.zone || 'Floor'} · {t.seats} seats · {t.status}
                  </span>
                </button>
              ))}
              {tables.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No tables configured
                </p>
              )}
            </div>
            <div className="border-t border-border p-3">
              <button
                type="button"
                className="w-full rounded-full py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                onClick={() => setTableOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
