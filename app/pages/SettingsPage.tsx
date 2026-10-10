import { useEffect, useState } from 'react'
import { Info, Palette, Printer } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '../components/ui/button'
import { Switch } from '../components/ui/switch'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { APP_CONFIG } from '@/lib/shared/config'
import {
  loadReceiptSettings,
  saveReceiptSettings,
  type ReceiptSettings,
} from '@/lib/receipt/receiptService'

export function SettingsPage() {
  const [notifications, setNotifications] = useState(true)
  const [appVersion, setAppVersion] = useState('1.0.0')
  const [receipt, setReceipt] = useState<ReceiptSettings>({
    autoPrint: false,
    autoShow: true,
    businessHeader: '',
  })
  const [savingReceipt, setSavingReceipt] = useState(false)

  useEffect(() => {
    window.api.settings.get('app_version').then((version) => {
      if (version) setAppVersion(version)
    })
    void loadReceiptSettings().then(setReceipt)
  }, [])

  const saveReceipt = async () => {
    setSavingReceipt(true)
    try {
      await saveReceiptSettings(receipt)
      toast.success('Receipt settings saved')
    } catch {
      toast.error('Could not save receipt settings')
    } finally {
      setSavingReceipt(false)
    }
  }

  return (
    <div className="p-0">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Application preferences and configuration
        </p>
      </div>

      <div className="space-y-6">
        <Card className="bg-card border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-primary-bg rounded-lg flex items-center justify-center">
              <Printer className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Receipts</h3>
              <p className="text-sm text-muted-foreground">
                Print and display receipts after a successful sale
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">Show receipt after sale</p>
                <p className="text-sm text-muted-foreground">Display receipt text when payment completes</p>
              </div>
              <Switch
                checked={receipt.autoShow}
                onCheckedChange={(autoShow) => setReceipt((s) => ({ ...s, autoShow }))}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">Auto-print after sale</p>
                <p className="text-sm text-muted-foreground">
                  Opens the system print dialog (thermal / Bluetooth printer when configured)
                </p>
              </div>
              <Switch
                checked={receipt.autoPrint}
                onCheckedChange={(autoPrint) => setReceipt((s) => ({ ...s, autoPrint }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Business name on receipt</label>
              <Input
                value={receipt.businessHeader}
                onChange={(e) =>
                  setReceipt((s) => ({ ...s, businessHeader: e.target.value }))
                }
                placeholder="Restaurant name"
              />
            </div>
            <Button onClick={() => void saveReceipt()} disabled={savingReceipt}>
              {savingReceipt ? 'Saving…' : 'Save receipt settings'}
            </Button>
          </div>
        </Card>

        <Card className="bg-card border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-primary-bg rounded-lg flex items-center justify-center">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Appearance</h3>
              <p className="text-sm text-muted-foreground">Customize how the app looks</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Dark mode</p>
              <p className="text-sm text-muted-foreground">
                The boilerplate ships with a dark theme by default
              </p>
            </div>
            <Switch defaultChecked disabled />
          </div>
        </Card>

        <Card className="bg-card border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-secondary/20 rounded-lg flex items-center justify-center">
              <Info className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <h3 className="font-semibold">Notifications</h3>
              <p className="text-sm text-muted-foreground">Configure notification preferences</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Desktop notifications</p>
              <p className="text-sm text-muted-foreground">Show system notifications</p>
            </div>
            <Switch checked={notifications} onCheckedChange={setNotifications} />
          </div>
        </Card>

        <Card className="bg-card border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div>
              <h3 className="font-semibold">About</h3>
              <p className="text-sm text-muted-foreground">{APP_CONFIG.name}</p>
              <p className="text-sm text-muted-foreground">Version: {appVersion}</p>
              <p className="text-sm text-muted-foreground text-italic">By Foodma Technologies</p>
            </div>
          </div>

         

         
        </Card>
      </div>
    </div>
  )
}
