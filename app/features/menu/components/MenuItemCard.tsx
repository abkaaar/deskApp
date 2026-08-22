import { formatCurrency } from '@/lib/checkout/format'
import type { MenuPost } from '@/lib/types/menu'
import { cn } from '@/lib/utils'

import { Switch } from '@/app/components/ui/switch'

type MenuItemCardProps = {
  item: MenuPost
  onEdit: (item: MenuPost) => void
  onToggleAvailability: (item: MenuPost, available: boolean) => void
}

export function MenuItemCard({ item, onEdit, onToggleAvailability }: MenuItemCardProps) {
  const isAvailable = item.is_available !== false
  const outOfStock =
    item.stock_quantity !== null &&
    item.stock_quantity !== undefined &&
    item.stock_quantity <= 0

  return (
    <button
      type="button"
      onClick={() => onEdit(item)}
      className={cn(
        'flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-left transition hover:border-primary/50 hover:bg-accent/40',
        !isAvailable && 'opacity-70',
      )}
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
        {item.image_url ? (
          <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl text-muted-foreground">
            🍽️
          </div>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div>
          <p className="line-clamp-2 text-sm font-semibold text-foreground">{item.title}</p>
          <p className="mt-1 text-sm font-bold text-primary">
            {item.price != null ? formatCurrency(item.price) : '—'}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {outOfStock ? (
              <span className="text-destructive">Out of stock</span>
            ) : item.stock_quantity != null ? (
              <span>{item.stock_quantity} in stock</span>
            ) : (
              <span>Unlimited stock</span>
            )}
          </div>

          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <span className="text-xs text-muted-foreground">{isAvailable ? 'Available' : 'Hidden'}</span>
            <Switch
              checked={isAvailable}
              onCheckedChange={(checked) => onToggleAvailability(item, checked)}
            />
          </div>
        </div>
      </div>
    </button>
  )
}
