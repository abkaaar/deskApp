import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/app/components/ui/button'
import {
  FormField,
  FormSheetBody,
  FormSheetFooter,
  FormSheetScroll,
} from '@/app/components/ui/form-sheet'
import { Input } from '@/app/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet'
import { TableService } from '@/lib/services/tableService'
import type { RestaurantTable } from '@/lib/types/table'

type TableSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendorId?: string
  table?: RestaurantTable | null
  onSaved: (table: RestaurantTable) => void
}

export function TableSheet({
  open,
  onOpenChange,
  vendorId,
  table,
  onSaved,
}: TableSheetProps) {
  const isEdit = Boolean(table)
  const [label, setLabel] = useState('')
  const [zone, setZone] = useState('')
  const [seats, setSeats] = useState('2')
  const [sortOrder, setSortOrder] = useState('0')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLabel(table?.label || '')
    setZone(table?.zone || '')
    setSeats(String(table?.seats ?? 2))
    setSortOrder(String(table?.sort_order ?? 0))
    setNotes(table?.notes || '')
  }, [open, table])

  const handleSave = async () => {
    if (!vendorId) {
      toast.error('Sign in required')
      return
    }
    if (!label.trim()) {
      toast.error('Table label is required (e.g. A1)')
      return
    }

    const seatsNum = Number.parseInt(seats, 10)
    if (!Number.isFinite(seatsNum) || seatsNum < 1) {
      toast.error('Seats must be at least 1')
      return
    }

    setLoading(true)
    const input = {
      label: label.trim(),
      zone: zone.trim() || undefined,
      seats: seatsNum,
      sort_order: Number.parseInt(sortOrder, 10) || 0,
      notes: notes.trim() || undefined,
    }

    const result = isEdit && table
      ? await TableService.updateTable(vendorId, table.id, input)
      : await TableService.createTable(vendorId, input)

    setLoading(false)

    if (result.error || !result.data) {
      toast.error(result.error || 'Could not save table')
      return
    }

    toast.success(isEdit ? 'Table updated' : 'Table added')
    onSaved(result.data)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit table' : 'Add table'}</SheetTitle>
          <SheetDescription>Labels like A1, A2, B1 define your floor layout.</SheetDescription>
        </SheetHeader>

        <FormSheetBody>
          <FormSheetScroll>
            <FormField label="Label">
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="A1"
              />
            </FormField>
            <FormField label="Zone / section">
              <Input
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                placeholder="Patio, Main hall..."
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Seats">
                <Input
                  type="number"
                  min={1}
                  value={seats}
                  onChange={(e) => setSeats(e.target.value)}
                />
              </FormField>
              <FormField label="Sort order">
                <Input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                />
              </FormField>
            </div>
            <FormField label="Notes">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </FormField>
          </FormSheetScroll>

          <FormSheetFooter>
            <Button
              className="w-full rounded-full"
              onClick={() => void handleSave()}
              disabled={loading}
            >
              {loading ? 'Saving...' : isEdit ? 'Save changes' : 'Add table'}
            </Button>
          </FormSheetFooter>
        </FormSheetBody>
      </SheetContent>
    </Sheet>
  )
}
