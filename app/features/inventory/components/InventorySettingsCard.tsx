import { toast } from 'sonner'

import { Card, CardContent } from '@/app/components/ui/card'
import { Switch } from '@/app/components/ui/switch'
import { InventoryService } from '@/lib/services/inventoryService'
import type { VendorInventorySettings } from '@/lib/types/inventory'

type InventorySettingsCardProps = {
  vendorId?: string
  settings: VendorInventorySettings | null
  onUpdated: (settings: VendorInventorySettings) => void
}

export function InventorySettingsCard({
  vendorId,
  settings,
  onUpdated,
}: InventorySettingsCardProps) {
  if (!settings || !vendorId) return null

  const handleToggle = async (
    key: 'auto_disable_menu_on_zero_stock' | 'low_stock_alerts_enabled',
    value: boolean,
  ) => {
    const result = await InventoryService.updateSettings(vendorId, { [key]: value })
    if (!result.success) {
      toast.error(result.error || 'Failed to update setting')
      return
    }

    onUpdated({ ...settings, [key]: value, updated_at: new Date().toISOString() })
    toast.success('Inventory setting updated')
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <h2 className="text-base font-semibold text-foreground">Inventory settings</h2>
          <p className="text-sm text-muted-foreground">Control alerts and menu sync behavior.</p>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Low stock alerts</p>
            <p className="text-xs text-muted-foreground">
              Notify when quantity falls below reorder level or hits zero.
            </p>
          </div>
          <Switch
            checked={settings.low_stock_alerts_enabled}
            onCheckedChange={(checked) =>
              void handleToggle('low_stock_alerts_enabled', checked)
            }
          />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              Auto-disable menu items when out of stock
            </p>
            <p className="text-xs text-muted-foreground">
              Finished products linked to menu posts are hidden when stock reaches zero.
              Recipe BOMs deduct ingredients on paid sales separately; menu stock is the
              sellable cache — if either is insufficient, block the sale.
            </p>
          </div>
          <Switch
            checked={settings.auto_disable_menu_on_zero_stock}
            onCheckedChange={(checked) =>
              void handleToggle('auto_disable_menu_on_zero_stock', checked)
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}
