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
import { CustomerService } from '@/lib/services/customerService'
import type { VendorCustomer } from '@/lib/types/customer'

type CustomerSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendorId?: string
  customer?: VendorCustomer | null
  onSaved: (customer: VendorCustomer) => void
}

export function CustomerSheet({
  open,
  onOpenChange,
  vendorId,
  customer,
  onSaved,
}: CustomerSheetProps) {
  const isEdit = Boolean(customer)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(customer?.name || '')
    setPhone(customer?.phone || '')
    setEmail(customer?.email || '')
    setAddress(customer?.address || '')
    setNotes(customer?.notes || '')
  }, [open, customer])

  const handleSave = async () => {
    if (!vendorId) {
      toast.error('Sign in required')
      return
    }
    if (!name.trim() && !phone.trim() && !email.trim()) {
      toast.error('Add a name, phone, or email')
      return
    }

    setLoading(true)
    const input = {
      name: name.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
    }

    const result = isEdit && customer
      ? await CustomerService.updateCustomer(vendorId, customer.id, input)
      : await CustomerService.createCustomer(vendorId, input)

    setLoading(false)

    if (result.error || !result.data) {
      toast.error(result.error || 'Could not save customer')
      return
    }

    toast.success(isEdit ? 'Customer updated' : 'Customer saved')
    onSaved(result.data)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit customer' : 'New customer'}</SheetTitle>
          <SheetDescription>
            Store phone, email, and address. Loyalty and rewards come later.
          </SheetDescription>
        </SheetHeader>

        <FormSheetBody>
          <FormSheetScroll>
            <FormField label="Name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Guest name"
              />
            </FormField>
            <FormField label="Phone">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234..."
              />
            </FormField>
            <FormField label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="guest@email.com"
              />
            </FormField>
            <FormField label="Address">
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Delivery or home address"
              />
            </FormField>
            <FormField label="Notes">
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Allergies, preferences..."
              />
            </FormField>
          </FormSheetScroll>

          <FormSheetFooter>
            <Button
              className="w-full rounded-full"
              onClick={() => void handleSave()}
              disabled={loading}
            >
              {loading ? 'Saving...' : isEdit ? 'Save changes' : 'Add customer'}
            </Button>
          </FormSheetFooter>
        </FormSheetBody>
      </SheetContent>
    </Sheet>
  )
}
