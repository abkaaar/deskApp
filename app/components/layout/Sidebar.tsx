import { useEffect, useState } from 'react'
import {
  ArrowLeftRight,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Cloud,
  CloudOff,
  Settings,
  ShoppingCart,
  Table2,
  Truck,
  Users,
  UtensilsCrossed,
  Warehouse,
} from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'

import { AccountAvatar, AccountSheet } from '@/app/components/layout/AccountSheet'
import { useAuthStore } from '@/app/stores/authStore'
import { useSyncStore } from '@/app/stores/syncStore'
import { isBrowserOffline } from '@/lib/checkout/saleOutbox'
import { cn, initials } from '@/lib/utils'
import { permissionForNavHref } from '@/lib/vendor-staff-permissions'
import { toast } from 'sonner'

const navigation = [
  { name: 'Checkout', icon: ShoppingCart, href: '/' },
  { name: 'Transactions', icon: ArrowLeftRight, href: '/transactions' },
  { name: 'Orders', icon: ClipboardList, href: '/orders' },
  { name: 'Kitchen', icon: ChefHat, href: '/kitchen' },
  { name: 'Delivery', icon: Truck, href: '/delivery' },
  { name: 'Tables', icon: Table2, href: '/tables' },
  { name: 'Menu', icon: UtensilsCrossed, href: '/menu' },
  { name: 'Inventory', icon: Warehouse, href: '/inventory' },
  { name: 'Customers', icon: Users, href: '/customers' },
  { name: 'Settings', icon: Settings, href: '/settings' },
] as const

type AppSidebarProps = {
  collapsed: boolean
  onToggleCollapsed: () => void
}

function planPillLabel(profile: {
  subscription_tier?: string | null
  premium_status?: string | null
}): string {
  const tier = profile.subscription_tier?.trim()
  if (tier) return `${tier} · Restaurant`
  const status = profile.premium_status?.trim()
  if (status) {
    const pretty = status.charAt(0).toUpperCase() + status.slice(1)
    return `${pretty} · Restaurant`
  }
  return 'Premium · Restaurant'
}

export function AppSidebar({ collapsed, onToggleCollapsed }: AppSidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const actor = useAuthStore((s) => s.actor)
  const staff = useAuthStore((s) => s.staff)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const signOut = useAuthStore((s) => s.signOut)
  const [accountOpen, setAccountOpen] = useState(false)
  const online = useSyncStore((s) => s.online)
  const pendingCount = useSyncStore((s) => s.pendingCount)
  const attentionCount = useSyncStore((s) => s.attentionCount)
  const flushing = useSyncStore((s) => s.flushing)
  const lastError = useSyncStore((s) => s.lastError)
  const flush = useSyncStore((s) => s.flush)
  const bindBrowserListeners = useSyncStore((s) => s.bindBrowserListeners)

  useEffect(() => bindBrowserListeners(), [bindBrowserListeners])

  const syncLabel = !online
    ? pendingCount > 0
      ? `Offline · ${pendingCount} pending`
      : attentionCount > 0
        ? `Offline · ${attentionCount} need attention`
        : 'Offline ready'
    : flushing
      ? 'Syncing…'
      : pendingCount > 0
        ? `${pendingCount} pending`
        : attentionCount > 0
          ? `${attentionCount} need attention`
          : 'Synced'

  const handleCloudClick = async () => {
    if (flushing) return
    if (!online && isBrowserOffline()) {
      toast.error('Reconnect to sync', {
        description:
          pendingCount > 0
            ? `${pendingCount} cash sale${pendingCount === 1 ? '' : 's'} waiting.`
            : undefined,
      })
      return
    }

    const result = await flush({ retryFailed: attentionCount > 0, probe: true })

    if (!result.online) {
      toast.error('Reconnect to sync')
      return
    }
    if (result.flushed > 0) {
      toast.success(
        `Synced ${result.flushed} sale${result.flushed === 1 ? '' : 's'}`,
        result.attention > 0
          ? { description: `${result.attention} still need attention.` }
          : undefined,
      )
      return
    }
    if (result.attention > 0 || result.remaining > 0) {
      toast.error(result.lastError || 'Could not sync all sales', {
        description:
          result.attention > 0
            ? `${result.attention} need attention.`
            : `${result.remaining} still pending.`,
      })
      return
    }
    toast.success('Already synced')
  }

  const displayName =
    actor === 'staff' && staff?.full_name
      ? staff.full_name
      : profile?.business_name || profile?.name || profile?.username || 'Restaurant'
  const avatarText = initials(displayName)
  const planText =
    actor === 'staff'
      ? `${staff?.role || 'staff'} · ${profile?.business_name || profile?.username || 'Restaurant'}`
      : planPillLabel(profile ?? {})

  const visibleNav = navigation.filter((item) => {
    if (actor === 'owner') return true
    const needed = permissionForNavHref(item.href)
    if (!needed) return true
    return hasPermission(needed)
  })

  const handleSignOut = async () => {
    await signOut()
    navigate('/sign-in', { replace: true })
  }

  return (
    <>
      <aside
        className={cn(
          'flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-in-out',
          collapsed ? 'w-[4.5rem]' : 'w-[260px]',
        )}
      >
        <div
          className={cn(
            'flex shrink-0 items-start gap-2 border-b border-sidebar-border px-3.5 pt-4 pb-3',
            collapsed ? 'flex-col items-center' : 'justify-between',
          )}
        >
          <button
            type="button"
            onClick={() => setAccountOpen(true)}
            title={collapsed ? displayName : undefined}
            className={cn(
              'min-w-0 text-left transition hover:opacity-90',
              collapsed ? 'flex justify-center' : 'flex flex-1 items-start gap-2.5',
            )}
          >
            <AccountAvatar label={avatarText} size="sm" />
            {!collapsed && (
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="truncate text-sm font-bold text-foreground">{displayName}</p>
                <span className="mt-1 inline-flex max-w-full truncate rounded-full bg-info/15 px-2 py-0.5 text-[11px] font-medium text-foreground">
                  {planText}
                </span>
              </div>
            )}
          </button>

          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-muted-foreground transition hover:text-sidebar-foreground"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3.5 py-3">
          <ul className="flex flex-col gap-1">
            {visibleNav.map((item) => {
              const isActive =
                item.href === '/'
                  ? location.pathname === '/'
                  : location.pathname === item.href ||
                    location.pathname.startsWith(`${item.href}/`)
              return (
                <li key={item.name}>
                  <NavLink
                    to={item.href}
                    title={collapsed ? item.name : undefined}
                    className={cn(
                      'flex w-full items-center rounded-full text-sm font-medium transition-colors',
                      collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-3.5 py-3',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-transparent text-foreground hover:bg-muted',
                    )}
                  >
                    <item.icon
                      className={cn(
                        'h-5 w-5 shrink-0',
                        isActive ? 'text-primary-foreground' : 'text-muted-foreground',
                      )}
                    />
                    {!collapsed && (
                      <span
                        className={cn(
                          'truncate',
                          isActive ? 'font-semibold' : 'font-medium',
                        )}
                      >
                        {item.name}
                      </span>
                    )}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-sidebar-border px-3.5 py-3">
          {collapsed ? (
            <button
              type="button"
              onClick={() => void handleCloudClick()}
              disabled={flushing}
              className="flex w-full items-center justify-center rounded-2xl py-2 text-muted-foreground transition hover:bg-muted disabled:opacity-60"
              title={lastError ? `${syncLabel} — ${lastError}` : `${syncLabel} — click to sync`}
            >
              {online && pendingCount === 0 && attentionCount === 0 ? (
                <Cloud className="h-4 w-4" />
              ) : (
                <CloudOff className="h-4 w-4" />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleCloudClick()}
              disabled={flushing}
              className="flex w-full flex-col gap-0.5 rounded-2xl bg-muted px-3 py-2.5 text-left transition hover:bg-muted/80 disabled:opacity-60"
              title={lastError ?? 'Click to sync pending sales'}
            >
              <span className="flex items-center gap-1.5">
                {online && pendingCount === 0 && attentionCount === 0 ? (
                  <Cloud className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <CloudOff className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="text-xs font-medium text-muted-foreground">{syncLabel}</span>
              </span>
              {lastError ? (
                <span className="line-clamp-2 pl-5 text-[10px] text-destructive">{lastError}</span>
              ) : null}
            </button>
          )}
        </div>
      </aside>

      <AccountSheet
        open={accountOpen}
        onOpenChange={setAccountOpen}
        profile={profile}
        onSignOut={handleSignOut}
      />
    </>
  )
}
