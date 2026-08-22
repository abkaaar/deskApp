import { useCallback, useEffect, useMemo, useState } from 'react'
import { ImagePlus, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/app/components/ui/button'
import {
  FormField,
  FormSheetBody,
  FormSheetFooter,
  FormSheetScroll,
  formTextareaClassName,
} from '@/app/components/ui/form-sheet'
import { Input } from '@/app/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet'
import { Switch } from '@/app/components/ui/switch'
import { MenuService } from '@/lib/services/menuService'
import type { CreateMenuAddonDraft, MenuPost } from '@/lib/types/menu'

type CreateMenuItemSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendorId?: string
  username?: string
  categorySuggestions?: string[]
  onCreated: (item: MenuPost) => void
}

function createAddonDraft(): CreateMenuAddonDraft {
  return {
    id: crypto.randomUUID(),
    title: '',
    price: '',
  }
}

export function CreateMenuItemSheet({
  open,
  onOpenChange,
  vendorId,
  username,
  categorySuggestions = [],
  onCreated,
}: CreateMenuItemSheetProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [price, setPrice] = useState('')
  const [stockQuantity, setStockQuantity] = useState('')
  const [prepTime, setPrepTime] = useState('')
  const [isAvailable, setIsAvailable] = useState(true)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [addons, setAddons] = useState<CreateMenuAddonDraft[]>([])
  const [loading, setLoading] = useState(false)

  const resetForm = useCallback(() => {
    setTitle('')
    setDescription('')
    setCategory('')
    setPrice('')
    setStockQuantity('')
    setPrepTime('')
    setIsAvailable(true)
    setImageFile(null)
    setImagePreview(null)
    setAddons([])
  }, [])

  useEffect(() => {
    if (!open) {
      resetForm()
    }
  }, [open, resetForm])

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  const validAddons = useMemo(
    () =>
      addons
        .map((addon) => ({
          title: addon.title.trim(),
          price: Number.parseFloat(addon.price),
        }))
        .filter((addon) => addon.title && Number.isFinite(addon.price) && addon.price >= 0),
    [addons],
  )

  const handleImageChange = (file: File | null) => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)

    if (!file) {
      setImageFile(null)
      setImagePreview(null)
      return
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return
    }

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleCreate = async () => {
    if (!vendorId || !username) {
      toast.error('Restaurant profile is not ready')
      return
    }

    if (!title.trim()) {
      toast.error('Title is required')
      return
    }

    const parsedPrice = price.trim() ? Number.parseFloat(price) : null
    if (price.trim() && (!Number.isFinite(parsedPrice) || parsedPrice! < 0)) {
      toast.error('Enter a valid price')
      return
    }

    setLoading(true)
    try {
      let imageUrl: string | null = null

      if (imageFile) {
        const upload = await MenuService.uploadMenuImage(vendorId, imageFile)
        if (!upload.url) {
          toast.error(upload.error || 'Failed to upload image')
          return
        }
        imageUrl = upload.url
      }

      const parsedStock = stockQuantity.trim() ? Number.parseInt(stockQuantity, 10) : null
      const parsedPrep = prepTime.trim() ? Number.parseInt(prepTime, 10) : null

      const result = await MenuService.createMenuItem(vendorId, username, {
        title,
        description,
        category: category.trim() || 'Uncategorized',
        price: parsedPrice,
        stock_quantity: parsedStock,
        prep_time_minutes: parsedPrep,
        is_available: isAvailable,
        image_url: imageUrl,
        addons: validAddons,
      })

      if (!result.data) {
        toast.error(result.error || 'Failed to create menu item')
        return
      }

      onCreated(result.data)
      toast.success('Menu item created', {
        description: 'Synced to POS, mobile app, storefront, and discovery website.',
      })
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Add menu item</SheetTitle>
          <SheetDescription>
            Create a new item once — it appears across all Foodma channels automatically.
          </SheetDescription>
        </SheetHeader>

        <FormSheetBody>
          <FormSheetScroll>
            <FormField label="Photo">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-40 w-full rounded-2xl object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleImageChange(null)}
                    className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5 text-foreground shadow"
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 text-sm text-muted-foreground transition hover:bg-accent/40">
                  <ImagePlus className="mb-2 h-6 w-6" />
                  <span>Upload photo (optional)</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
                  />
                </label>
              )}
            </FormField>

            <FormField label="Title *">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Jollof Rice & Chicken"
              />
            </FormField>

            <FormField label="Description">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Ingredients, portion size, spice level…"
                className={formTextareaClassName}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Category">
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Mains"
                  list="menu-category-suggestions"
                />
                <datalist id="menu-category-suggestions">
                  {categorySuggestions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </FormField>
              <FormField label="Price (₦)">
                <Input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  inputMode="decimal"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Stock">
                <Input
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  placeholder="Unlimited"
                  inputMode="numeric"
                />
              </FormField>
              <FormField label="Prep time (mins)">
                <Input
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  inputMode="numeric"
                />
              </FormField>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3.5">
              <div>
                <p className="text-sm font-medium text-foreground">Available on menu</p>
                <p className="text-xs text-muted-foreground">Show immediately after creating</p>
              </div>
              <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Add-ons
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setAddons((prev) => [...prev, createAddonDraft()])}
                >
                  <Plus className="h-4 w-4" />
                  Add option
                </Button>
              </div>

              {addons.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Optional extras like extra protein, drinks, or sides.
                </p>
              ) : (
                <ul className="space-y-3">
                  {addons.map((addon) => (
                    <li key={addon.id} className="flex items-center gap-2">
                      <Input
                        value={addon.title}
                        onChange={(e) =>
                          setAddons((prev) =>
                            prev.map((row) =>
                              row.id === addon.id ? { ...row, title: e.target.value } : row,
                            ),
                          )
                        }
                        placeholder="Extra chicken"
                        className="flex-1"
                      />
                      <Input
                        value={addon.price}
                        onChange={(e) =>
                          setAddons((prev) =>
                            prev.map((row) =>
                              row.id === addon.id ? { ...row, price: e.target.value } : row,
                            ),
                          )
                        }
                        placeholder="₦"
                        inputMode="decimal"
                        className="w-24"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setAddons((prev) => prev.filter((row) => row.id !== addon.id))
                        }
                        className="rounded-xl p-2 text-muted-foreground transition hover:bg-accent hover:text-destructive"
                        aria-label="Remove add-on"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </FormSheetScroll>

          <FormSheetFooter>
            <Button
              className="w-full rounded-full"
              disabled={loading}
              onClick={() => void handleCreate()}
            >
              {loading ? 'Creating…' : 'Create menu item'}
            </Button>
          </FormSheetFooter>
        </FormSheetBody>
      </SheetContent>
    </Sheet>
  )
}
