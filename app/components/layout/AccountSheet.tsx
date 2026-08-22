import { Info, Lightbulb, Settings, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/app/components/ui/sheet'
import type { RestaurantDesktopProfile } from '@/lib/auth/vendor-auth'
import { cn, initials } from '@/lib/utils'

type AccountSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: RestaurantDesktopProfile | null
  onSignOut: () => void | Promise<void>
}

function planLabel(profile: RestaurantDesktopProfile | null): string {
  const tier = profile?.subscription_tier?.trim()
  if (tier) return tier
  const status = profile?.premium_status?.trim()
  if (status) return status.charAt(0).toUpperCase() + status.slice(1)
  return 'Premium'
}

function roleLabel(profile: RestaurantDesktopProfile | null): string {
  const role = profile?.role?.trim()
  if (!role) return 'Owner'
  return role.charAt(0).toUpperCase() + role.slice(1)
}

function AccountAvatar({
  label,
  size = 'md',
}: {
  label: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const dim = size === 'lg' ? 'h-14 w-14 text-lg' : size === 'sm' ? 'h-10 w-10 text-sm' : 'h-11 w-11 text-sm'
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl bg-[#f8d7da]',
        dim,
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-md bg-primary font-bold italic text-primary-foreground',
          size === 'lg' ? 'h-9 w-9' : size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-7 w-7 text-xs',
        )}
      >
        {label}
      </div>
    </div>
  )
}

export function AccountSheet({ open, onOpenChange, profile, onSignOut }: AccountSheetProps) {
  const navigate = useNavigate()
  const displayName =
    profile?.business_name || profile?.name || profile?.username || 'Restaurant'
  const avatarText = initials(displayName)
  const plan = planLabel(profile)
  const role = roleLabel(profile)

  const goSettings = () => {
    onOpenChange(false)
    navigate('/settings')
  }

  const suggestFeature = () => {
    window.open(
      'mailto:support@foodma.app?subject=Feature%20suggestion',
      '_blank',
    )
  }

  const handleSignOut = async () => {
    onOpenChange(false)
    await onSignOut()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md [&>button]:hidden"
      >
        <SheetTitle className="sr-only">Account</SheetTitle>
        <SheetDescription className="sr-only">
          Profile, plan, and account actions
        </SheetDescription>

        <div className="flex items-center justify-between px-4 pt-4">
          <SheetClose asChild>
            <button
              type="button"
              aria-label="Close account panel"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground transition hover:bg-muted/80"
            >
              <X className="h-4 w-4" />
            </button>
          </SheetClose>
        </div>

        <div className="space-y-5 px-4 pb-6 pt-4">
          <div className="rounded-2xl border border-border p-4">
            <AccountAvatar label={avatarText} size="lg" />
            <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
              {displayName}
            </p>
            {profile?.username && (
              <p className="mt-1 text-sm text-muted-foreground">@{profile.username}</p>
            )}
          </div>

          <div className="rounded-2xl bg-info/10 px-4 py-3 text-foreground">
            <Info className="mb-2 h-4 w-4 text-info" />
            <p className="text-sm font-bold">You&apos;re on {plan}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Foodma Restaurant Desktop is ready for checkout, kitchen, and delivery
              tools for your team.
            </p>
            <p className="mt-2 text-sm font-medium text-info underline-offset-2">
              Manage plan
            </p>
          </div>

          <div className="divide-y divide-border rounded-2xl border border-border">
            <button
              type="button"
              onClick={goSettings}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-semibold transition hover:bg-muted"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              Account settings
            </button>
            <button
              type="button"
              onClick={suggestFeature}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-semibold transition hover:bg-muted"
            >
              <Lightbulb className="h-4 w-4 text-muted-foreground" />
              Suggest a feature
            </button>
          </div>

          <div className="rounded-2xl border border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">{role}</p>
          </div>

          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
          >
            Sign out
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export { AccountAvatar }
