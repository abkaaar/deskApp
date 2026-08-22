import { useMemo, useState } from 'react'
import { ArrowLeftRight, Combine, Plus, RefreshCw, Split, Table2 } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet'
import { TableService } from '@/lib/services/tableService'
import {
  TABLE_STATUS_LABELS,
  type RestaurantTable,
  type TableStatus,
} from '@/lib/types/table'

import { TableSheet } from './components/TableSheet'
import { TableTile } from './components/TableTile'
import { useVendorTables } from './hooks/useVendorTables'

const STATUSES: TableStatus[] = ['available', 'occupied', 'reserved', 'cleaning']

export function TablesPage() {
  const {
    vendorId,
    tables,
    sessions,
    loading,
    refreshing,
    error,
    stats,
    refresh,
    upsertLocal,
    removeLocal,
  } = useVendorTables()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [editing, setEditing] = useState<RestaurantTable | null>(null)
  const [active, setActive] = useState<RestaurantTable | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [transferTargetId, setTransferTargetId] = useState('')
  const [busy, setBusy] = useState(false)

  const zones = useMemo(() => {
    const map = new Map<string, RestaurantTable[]>()
    for (const table of tables) {
      const key = table.zone?.trim() || 'Floor'
      const list = map.get(key) || []
      list.push(table)
      map.set(key, list)
    }
    return [...map.entries()]
  }, [tables])

  const availableTargets = useMemo(
    () => tables.filter((t) => t.status === 'available' && t.id !== active?.id),
    [tables, active],
  )

  const activeSession = useMemo(
    () => sessions.find((s) => s.table_id === active?.id) ?? null,
    [sessions, active],
  )

  const toggleSelect = (table: RestaurantTable) => {
    setSelectedIds((prev) =>
      prev.includes(table.id) ? prev.filter((id) => id !== table.id) : [...prev, table.id],
    )
  }

  const openActions = (table: RestaurantTable) => {
    setActive(table)
    setTransferTargetId('')
    setActionsOpen(true)
  }

  const handleStatus = async (status: TableStatus) => {
    if (!vendorId || !active) return
    setBusy(true)
    const result = await TableService.setStatus(vendorId, active.id, status)
    setBusy(false)
    if (result.error || !result.data) {
      toast.error(result.error || 'Could not update status')
      return
    }
    upsertLocal(result.data)
    setActive(result.data)
    toast.success(`Marked ${result.data.label} as ${TABLE_STATUS_LABELS[status]}`)
    await refresh()
  }

  const handleTransfer = async () => {
    if (!active || !transferTargetId) {
      toast.error('Pick a destination table')
      return
    }
    setBusy(true)
    const result = await TableService.transferTable(active.id, transferTargetId)
    setBusy(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Table transferred')
    setActionsOpen(false)
    setSelectedIds([])
    await refresh()
  }

  const handleMerge = async () => {
    if (selectedIds.length < 2) {
      toast.error('Select at least two tables to merge')
      return
    }
    setBusy(true)
    const result = await TableService.mergeTables(selectedIds)
    setBusy(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Tables merged')
    setSelectedIds([])
    await refresh()
  }

  const handleUnmerge = async () => {
    if (!active?.merged_group_id) return
    setBusy(true)
    const result = await TableService.unmergeTables(active.merged_group_id)
    setBusy(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Tables unmerged')
    await refresh()
  }

  const handleSplitBill = async () => {
    if (!vendorId || !activeSession) {
      toast.error('Open an occupied session first, then attach orders to split')
      return
    }
    toast.message('Split bills', {
      description:
        'Link checkout orders to this session with a split label. Full split checkout UI ships next.',
    })
  }

  const handleDelete = async () => {
    if (!vendorId || !active) return
    setBusy(true)
    const result = await TableService.deleteTable(vendorId, active.id)
    setBusy(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    removeLocal(active.id)
    setActionsOpen(false)
    toast.success('Table removed')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tables</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Floor layout, status, transfer, merge, and split bills.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
            variant="outline"
            onClick={() => void handleMerge()}
            disabled={busy || selectedIds.length < 2}
          >
            <Combine className="mr-2 h-4 w-4" />
            Merge selected
          </Button>
          <Button
            onClick={() => {
              setEditing(null)
              setSheetOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add table
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {(
          [
            ['Total', stats.total],
            ['Available', stats.available],
            ['Occupied', stats.occupied],
            ['Reserved', stats.reserved],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">{selectedIds.length} selected</Badge>
          Click tiles to multi-select for merge. Double-click a table for actions.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading floor plan...</p>
      ) : tables.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
          <Table2 className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">No tables yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add A1, A2, B1… to build your restaurant layout.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {zones.map(([zone, zoneTables]) => (
            <section key={zone}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {zone}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                {zoneTables.map((table) => (
                  <TableTile
                    key={table.id}
                    table={table}
                    selected={selectedIds.includes(table.id)}
                    onSelect={toggleSelect}
                    onOpenActions={openActions}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <TableSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        vendorId={vendorId}
        table={editing}
        onSaved={upsertLocal}
      />

      <Sheet open={actionsOpen} onOpenChange={setActionsOpen}>
        <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Table {active?.label}</SheetTitle>
            <SheetDescription>
              Update status, transfer guests, merge, or prepare a split bill.
            </SheetDescription>
          </SheetHeader>

          {active && (
            <div className="space-y-5 px-5 py-5">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {STATUSES.map((status) => (
                    <Button
                      key={status}
                      variant={active.status === status ? 'default' : 'outline'}
                      size="sm"
                      className="rounded-xl"
                      disabled={busy}
                      onClick={() => void handleStatus(status)}
                    >
                      {TABLE_STATUS_LABELS[status]}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Transfer to
                </p>
                <select
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  value={transferTargetId}
                  onChange={(e) => setTransferTargetId(e.target.value)}
                >
                  <option value="">Select available table</option>
                  {availableTargets.map((table) => (
                    <option key={table.id} value={table.id}>
                      {table.label}
                      {table.zone ? ` (${table.zone})` : ''}
                    </option>
                  ))}
                </select>
                <Button
                  className="w-full rounded-full"
                  variant="secondary"
                  disabled={busy || !transferTargetId}
                  onClick={() => void handleTransfer()}
                >
                  <ArrowLeftRight className="mr-2 h-4 w-4" />
                  Transfer
                </Button>
              </div>

              {active.merged_group_id && (
                <Button
                  className="w-full rounded-full"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void handleUnmerge()}
                >
                  Unmerge group
                </Button>
              )}

              <Button
                className="w-full rounded-full"
                variant="outline"
                disabled={busy}
                onClick={() => void handleSplitBill()}
              >
                <Split className="mr-2 h-4 w-4" />
                Split bill
              </Button>

              <Button
                className="w-full rounded-full"
                variant="outline"
                onClick={() => {
                  setEditing(active)
                  setActionsOpen(false)
                  setSheetOpen(true)
                }}
              >
                Edit table
              </Button>

              <Button
                className="w-full rounded-full"
                variant="destructive"
                disabled={busy}
                onClick={() => void handleDelete()}
              >
                Remove table
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
