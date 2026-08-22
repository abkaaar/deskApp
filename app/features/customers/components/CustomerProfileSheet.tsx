import { Gift, Sparkles, Tag } from 'lucide-react'

import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet'
import type { VendorCustomer } from '@/lib/types/customer'

type CustomerProfileSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: VendorCustomer | null
  onEdit: (customer: VendorCustomer) => void
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function CustomerProfileSheet({
  open,
  onOpenChange,
  customer,
  onEdit,
}: CustomerProfileSheetProps) {
  if (!customer) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{customer.name || 'Customer profile'}</SheetTitle>
          <SheetDescription>Contact details, spend history, and favorites.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <section className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Phone: </span>
              {customer.phone || '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Email: </span>
              {customer.email || '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Address: </span>
              {customer.address || '—'}
            </p>
            {customer.notes && (
              <p>
                <span className="text-muted-foreground">Notes: </span>
                {customer.notes}
              </p>
            )}
          </section>

          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">Total orders</p>
              <p className="mt-1 text-xl font-semibold">{customer.total_orders}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">Lifetime spend</p>
              <p className="mt-1 text-xl font-semibold">
                {formatMoney(customer.lifetime_spend)}
              </p>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">Favorite meals</h3>
            {customer.favorite_meals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No favorites yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {customer.favorite_meals.map((meal) => (
                  <Badge key={`${meal.title}-${meal.order_count}`} variant="secondary">
                    {meal.title} ×{meal.order_count}
                  </Badge>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-dashed border-border p-4">
            <h3 className="mb-3 text-sm font-semibold">Coming soon</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-secondary" /> Loyalty points
              </li>
              <li className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-secondary" /> Rewards
              </li>
              <li className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-secondary" /> Promotions
              </li>
            </ul>
          </section>

          <Button
            className="w-full"
            onClick={() => {
              onOpenChange(false)
              onEdit(customer)
            }}
          >
            Edit profile
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
