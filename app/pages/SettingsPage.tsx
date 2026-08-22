import { useEffect, useState } from 'react'
import { Info, Palette } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Switch } from '../components/ui/switch'
import { Card } from '../components/ui/card'
import { APP_CONFIG } from '@/lib/shared/config'

export function SettingsPage() {
  const [notifications, setNotifications] = useState(true)
  const [appVersion, setAppVersion] = useState('1.0.0')

  useEffect(() => {
    window.api.settings.get('app_version').then((version) => {
      if (version) setAppVersion(version)
    })
  }, [])

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
              <p className="text-sm text-muted-foreground">{APP_CONFIG.name} desktop boilerplate</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Version: </span>
              {appVersion}
            </p>
            <p>
              <span className="text-muted-foreground">Stack: </span>
              Electron + React + Vite + SQLite
            </p>
          </div>

          <Button variant="outline" size="sm" className="mt-4" disabled>
            Check for updates
          </Button>
        </Card>
      </div>
    </div>
  )
}
