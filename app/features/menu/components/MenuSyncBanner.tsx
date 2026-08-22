import {
  ArrowRight,
  CheckCircle2,
  Globe,
  RefreshCw,
  Smartphone,
  Store,
} from 'lucide-react'

import { Badge } from '@/app/components/ui/badge'
import { Card, CardContent } from '@/app/components/ui/card'

const SYNC_TARGETS = [
  { icon: Store, label: 'POS' },
  { icon: Smartphone, label: 'Mobile App' },
  { icon: Globe, label: 'Storefront' },
  { icon: Globe, label: 'Discovery Website' },
] as const

export function MenuSyncBanner() {
  return (
    <Card className="border-primary/20 bg-primary-bg/40">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
              Menu Management
            </p>
            <h2 className="text-lg font-semibold text-foreground">
              Update your menu once. It syncs everywhere automatically.
            </h2>
            <p className="text-sm text-muted-foreground">
              Changes made here update your POS, mobile app, storefront, and discovery website.
              No duplicate work.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {SYNC_TARGETS.map(({ icon: Icon, label }) => (
              <Badge key={label} variant="secondary" className="gap-1.5 px-3 py-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Badge>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Synced from Foodma in real time</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </CardContent>
    </Card>
  )
}
