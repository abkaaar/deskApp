import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  listHeldCarts,
  type HeldCartView,
} from '@/lib/checkout/heldCarts'
import { CustomerService } from '@/lib/services/customerService'
import { TableService } from '@/lib/services/tableService'
import { getSupabaseClient } from '@/lib/supabase/client'
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
  const restoreHeldSale = useCheckoutStore((s) => s.restoreHeldSale)
  const cart = useCheckoutStore((s) => s.cart)

  const [customerOpen, setCustomerOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [tableOpen, setTableOpen] = useState(false)
  const [customers, setCustomers] = useState<VendorCustomer[]>([])
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

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

  const handleCreate = async () => {
    if (!vendorId || !name.trim()) return
    setSaving(true)
    try {
      const result = await CustomerService.createCustomer(vendorId, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      })
      if (result.error || !result.data) {
        toast.error(result.error || 'Could not save customer')
        return
      }
      setCustomer(result.data.id, result.data.name || result.data.phone || 'Customer')
      setAddOpen(false)
      setCustomerOpen(false)
      setName('')
      setPhone('')
      setEmail('')
      toast.success('Customer saved')
    } finally {
      setSaving(false)
    }
  }

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
              <button
                type="button"
                className="w-full rounded-xl px-3 py-3 text-left text-sm font-semibold text-primary hover:bg-muted"
                onClick={() => setAddOpen(true)}
              >
                Add new customer
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

      {addOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-[20px] border border-border bg-card shadow-xl">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-lg font-bold">Add customer</h3>
            </div>
            <div className="space-y-3 p-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone"
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
              />
            </div>
            <div className="flex gap-2 border-t border-border p-3">
              <button
                type="button"
                className="flex-1 rounded-full py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                onClick={() => setAddOpen(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !name.trim()}
                onClick={() => void handleCreate()}
                className="flex-[1.4] rounded-full bg-primary py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
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
                  className={cn(
                    'w-full rounded-xl px-3 py-3 text-left text-sm hover:bg-muted',
                    t.status === 'occupied' && 'border border-warning/40 bg-warning/5',
                  )}
                  onClick={() => {
                    void (async () => {
                      if (
                        (t.status === 'occupied' || t.status === 'reserved') &&
                        vendorId
                      ) {
                        // Prefer resuming a local hold for this table.
                        let holdMatch: HeldCartView | null = null
                        try {
                          const holds = await listHeldCarts(vendorId)
                          holdMatch =
                            holds.find((h) => h.payload.tableId === t.id) ??
                            holds.find((h) => h.payload.tableLabel === t.label) ??
                            null
                        } catch {
                          holdMatch = null
                        }
                        if (holdMatch) {
                          const resume = window.confirm(
                            `Table ${t.label} has a held cart (${holdMatch.itemCount} items). Resume it?\n\nOK = resume held sale\nCancel = start a new draft on this table`,
                          )
                          if (resume) {
                            if (cart.length > 0) {
                              const wipe = window.confirm(
                                'Current cart will be replaced by the held sale. Continue?',
                              )
                              if (!wipe) return
                            }
                            const ok = restoreHeldSale(holdMatch.payload)
                            if (ok) {
                              toast.success(`Resumed hold for ${t.label}`)
                              setTableOpen(false)
                              return
                            }
                          }
                        }

                        // Else look for an unpaid cloud POS order on this table.
                        try {
                          const supabase = getSupabaseClient()
                          const { data } = await supabase
                            .from('orders')
                            .select('id, total, payment_status, pos_meta, notes')
                            .eq('vendor_id', vendorId)
                            .eq('source', 'pos')
                            .neq('payment_status', 'paid')
                            .neq('payment_status', 'refunded')
                            .order('created_at', { ascending: false })
                            .limit(30)
                          const openBill = (data ?? []).find((row) => {
                            const meta = row.pos_meta as Record<string, unknown> | null
                            return (
                              meta?.table_id === t.id ||
                              (typeof row.notes === 'string' &&
                                row.notes.includes(t.label))
                            )
                          })
                          if (openBill) {
                            const attach = window.confirm(
                              `Table ${t.label} has open unpaid order #${String(openBill.id).slice(0, 8)} (₦${Math.round(Number(openBill.total) || 0).toLocaleString()}).\n\nOK = attach table to this draft anyway\nCancel = leave cart unchanged and open Tables/Orders to collect`,
                            )
                            if (!attach) {
                              setTableOpen(false)
                              toast.message(
                                `Open unpaid bill #${String(openBill.id).slice(0, 8)} from Orders or Tables`,
                              )
                              return
                            }
                          } else {
                            const ok = window.confirm(
                              `Table ${t.label} is ${t.status}. Attach this new draft anyway?`,
                            )
                            if (!ok) return
                          }
                        } catch {
                          const ok = window.confirm(
                            `Table ${t.label} is ${t.status}. Attach this new draft anyway?`,
                          )
                          if (!ok) return
                        }
                      }

                      setTable(t.id, t.label)
                      if (vendorId && t.status === 'available') {
                        void TableService.setStatus(vendorId, t.id, 'occupied').catch(
                          () => undefined,
                        )
                      }
                      setTableOpen(false)
                    })()
                  }}
                >
                  <span className="font-medium">{t.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {t.zone || 'Floor'} · {t.seats} seats · {t.status}
                    {t.status === 'occupied' ? ' · warn before new draft' : ''}
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
