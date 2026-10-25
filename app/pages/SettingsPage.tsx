import { useEffect, useState } from 'react'
import { Info, Palette, Printer, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '../components/ui/button'
import { Switch } from '../components/ui/switch'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { APP_CONFIG } from '@/lib/shared/config'
import type { UpdaterStatus } from '@/lib/shared/updater'
import {
  loadReceiptSettings,
  saveReceiptSettings,
  type ReceiptSettings,
} from '@/lib/receipt/receiptService'

function statusLabel(status: UpdaterStatus | null): string {
  if (!status) return ''
  switch (status.status) {
    case 'checking':
      return 'Checking for updates…'
    case 'available':
      return `Update available: v${status.version}`
    case 'not-available':
      return `You're on the latest version (v${status.version})`
    case 'downloading':
      return `Downloading… ${status.percent}%`
    case 'downloaded':
      return `Update v${status.version} ready to install`
    case 'error':
      return status.message
    case 'dev-skipped':
      return status.message
    default:
      return ''
  }
}

export function SettingsPage() {
  const [notifications, setNotifications] = useState(true)
  const [appVersion, setAppVersion] = useState('…')
  const [updaterStatus, setUpdaterStatus] = useState<UpdaterStatus | null>(null)
  const [updaterBusy, setUpdaterBusy] = useState(false)
  const [receipt, setReceipt] = useState<ReceiptSettings>({
    autoPrint: false,
    autoShow: true,
    businessHeader: '',
  })
  const [savingReceipt, setSavingReceipt] = useState(false)

  useEffect(() => {
    void window.api.app.getVersion().then(setAppVersion)
    void loadReceiptSettings().then(setReceipt)
    return window.api.updater.onStatus((status) => {
      setUpdaterStatus(status)
      if (status.status === 'error') {
        toast.error(status.message)
      }
    })
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

  const checkForUpdates = async () => {
    setUpdaterBusy(true)
    try {
      const result = await window.api.updater.check()
      setUpdaterStatus(result)
      if (result.status === 'available') {
        toast.success(`Update v${result.version} available`)
      } else if (result.status === 'not-available') {
        toast.success('You are up to date')
      } else if (result.status === 'dev-skipped') {
        toast.message(result.message)
      } else if (result.status === 'error') {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not check for updates')
    } finally {
      setUpdaterBusy(false)
    }
  }

  const downloadUpdate = async () => {
    setUpdaterBusy(true)
    try {
      const result = await window.api.updater.download()
      if (result.status === 'error') {
        toast.error(result.message || 'Download failed')
      } else if (result.status === 'dev-skipped') {
        toast.message(result.message || 'Updates only work in the installed app')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Download failed')
    } finally {
      setUpdaterBusy(false)
    }
  }

  const installUpdate = async () => {
    setUpdaterBusy(true)
    try {
      await window.api.updater.install()
    } catch (error) {
      setUpdaterBusy(false)
      toast.error(error instanceof Error ? error.message : 'Could not install update')
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
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="font-semibold">About</h3>
              <p className="text-sm text-muted-foreground">{APP_CONFIG.name}</p>
              <p className="text-sm text-muted-foreground">Version: {appVersion}</p>
              <p className="text-sm text-muted-foreground italic">By Foodma Technologies</p>
            </div>
            <div className="h-10 w-10 bg-primary-bg rounded-lg flex items-center justify-center shrink-0">
              <RefreshCw className="h-5 w-5 text-primary" />
            </div>
          </div>

          <div className="space-y-3">
            {updaterStatus && (
              <p className="text-sm text-muted-foreground">{statusLabel(updaterStatus)}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => void checkForUpdates()}
                disabled={updaterBusy || updaterStatus?.status === 'downloading'}
              >
                {updaterBusy && updaterStatus?.status === 'checking'
                  ? 'Checking…'
                  : 'Check for updates'}
              </Button>
              {updaterStatus?.status === 'available' && (
                <Button variant="secondary" onClick={() => void downloadUpdate()} disabled={updaterBusy}>
                  Download update
                </Button>
              )}
              {updaterStatus?.status === 'downloaded' && (
                <Button onClick={() => void installUpdate()} disabled={updaterBusy}>
                  Restart to install
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
