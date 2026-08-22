import { cn } from '@/lib/utils'
import { TABLE_STATUS_LABELS, type RestaurantTable, type TableStatus } from '@/lib/types/table'

type TableTileProps = {
  table: RestaurantTable
  selected: boolean
  onSelect: (table: RestaurantTable) => void
  onOpenActions: (table: RestaurantTable) => void
}

const STATUS_STYLES: Record<TableStatus, string> = {
  available: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  occupied: 'border-primary/40 bg-primary/10 text-primary',
  reserved: 'border-secondary/50 bg-secondary/15 text-foreground',
  cleaning: 'border-muted-foreground/30 bg-muted text-muted-foreground',
}

export function TableTile({ table, selected, onSelect, onOpenActions }: TableTileProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(table)}
      onDoubleClick={() => onOpenActions(table)}
      className={cn(
        'relative flex min-h-[7.5rem] flex-col items-center justify-center rounded-2xl border-2 p-4 text-center transition',
        STATUS_STYLES[table.status],
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
      )}
    >
      <span className="text-2xl font-bold tracking-tight">{table.label}</span>
      <span className="mt-1 text-xs font-medium uppercase tracking-wide opacity-80">
        {TABLE_STATUS_LABELS[table.status]}
      </span>
      <span className="mt-2 text-xs opacity-70">
        {table.seats} seats{table.zone ? ` · ${table.zone}` : ''}
      </span>
      {table.merged_group_id && (
        <span className="absolute right-2 top-2 rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
          Merged
        </span>
      )}
    </button>
  )
}
