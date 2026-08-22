import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'
import type { VendorCustomer } from '@/lib/types/customer'

type CustomerCardProps = {
  customer: VendorCustomer
  onEdit: (customer: VendorCustomer) => void
  onView: (customer: VendorCustomer) => void
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function CustomerCard({ customer, onEdit, onView }: CustomerCardProps) {
  const favorites = customer.favorite_meals.slice(0, 3)

  return (
    <Card className="border-border/70">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {customer.name || customer.phone || customer.email || 'Guest'}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {[customer.phone, customer.email].filter(Boolean).join(' · ') || 'No contact'}
            </p>
          </div>
          <Badge variant={customer.is_active ? 'default' : 'secondary'}>
            {customer.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground">Orders</p>
            <p className="font-medium">{customer.total_orders}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Lifetime</p>
            <p className="font-medium">{formatMoney(customer.lifetime_spend)}</p>
          </div>
        </div>

        {customer.address && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{customer.address}</p>
        )}

        {favorites.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {favorites.map((meal) => (
              <Badge key={`${meal.title}-${meal.order_count}`} variant="secondary">
                {meal.title}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => onView(customer)}>
            Profile
          </Button>
          <Button size="sm" variant="secondary" className="flex-1" onClick={() => onEdit(customer)}>
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
