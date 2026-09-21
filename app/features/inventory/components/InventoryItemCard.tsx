import { ArrowDownUp, ClipboardCheck, Package } from 'lucide-react'

import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { computeStockStatus } from '@/lib/inventory/status'
import {
  ITEM_TYPE_LABELS,
  LEVEL_VALUE_LABELS,
  TRACKING_METHOD_LABELS,
  type InventoryItem,
} from '@/lib/types/inventory'
import { cn } from '@/lib/utils'

type InventoryItemCardProps = {
  item: InventoryItem
  onRecordMovement: (item: InventoryItem) => void
  onStockCount: (item: InventoryItem) => void
  onEdit: (item: InventoryItem) => void
}

export function InventoryItemCard({
  item,
  onRecordMovement,
  onStockCount,
  onEdit,
}: InventoryItemCardProps) {
  const onHandLabel =
    item.tracking_method === 'level' && item.level_value
      ? LEVEL_VALUE_LABELS[item.level_value]
      : `${item.quantity_on_hand} ${item.unit}`

  const status = computeStockStatus(item.quantity_on_hand, item.reorder_level)

  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {ITEM_TYPE_LABELS[item.item_type]}
            {' · '}
            {TRACKING_METHOD_LABELS[item.tracking_method ?? 'quantity']}
          </p>
          {item.linked_menu_title && (
            <p className="mt-1 text-xs text-primary">
              Menu sellable cache: {item.linked_menu_title}
            </p>
          )}
        </div>
        <Badge
          variant="outline"
          className={cn(
            status === 'out_of_stock' && 'border-destructive/30 bg-destructive/10 text-destructive',
            status === 'low_stock' && 'border-warning/30 bg-warning/15 text-warning',
          )}
        >
          {status === 'out_of_stock' ? 'Out' : status === 'low_stock' ? 'Low' : 'Healthy'}
        </Badge>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">On hand (ledger)</p>
          <p className="font-semibold text-foreground">{onHandLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Reorder at</p>
          <p className="text-sm text-foreground">
            {item.reorder_level} {item.unit}
          </p>
        </div>
      </div>

      {status !== 'healthy' && (
        <p className="mt-2 text-xs text-warning">
          Suggest reorder{' '}
          {(item.reorder_quantity > 0
            ? item.reorder_quantity
            : Math.max(item.reorder_level * 2 - item.quantity_on_hand, item.reorder_level)
          ).toFixed(1)}{' '}
          {item.unit}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => onRecordMovement(item)}
        >
          <ArrowDownUp className="h-4 w-4" />
          Move
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => onStockCount(item)}
        >
          <ClipboardCheck className="h-4 w-4" />
          Count
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(item)}>
          <Package className="h-4 w-4" />
          Edit
        </Button>
      </div>
    </article>
  )
}
