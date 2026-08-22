import {
  ChefHat,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Home,
  LogOut,
  Settings,
  ShoppingCart,
  Table2,
  UserRound,
  Users,
  UtensilsCrossed,
  Warehouse,
} from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'

import { useAuthStore } from '@/app/stores/authStore'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Home', icon: Home, href: '/' },
  { name: 'Checkout', icon: ShoppingCart, href: '/checkout' },
  { name: 'Orders', icon: ClipboardList, href: '/orders' },
  { name: 'Kitchen', icon: ChefHat, href: '/kitchen' },
  { name: 'Menu', icon: UtensilsCrossed, href: '/menu' },
  { name: 'Inventory', icon: Warehouse, href: '/inventory' },
  { name: 'Customers', icon: Users, href: '/customers' },
  { name: 'Staff', icon: UserRound, href: '/staff' },
  { name: 'Tables', icon: Table2, href: '/tables' },
  { name: 'Settings', icon: Settings, href: '/settings' },
] as const

type AppSidebarProps = {
  collapsed: boolean
  onToggleCollapsed: () => void
}

export function AppSidebar({ collapsed, onToggleCollapsed }: AppSidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const signOut = useAuthStore((s) => s.signOut)

  const displayName =
    profile?.business_name || profile?.name || profile?.username || 'Restaurant'

  const handleSignOut = async () => {
    await signOut()
    navigate('/sign-in', { replace: true })
  }

  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-[4.5rem]' : 'w-60',
      )}
    >
      {/* Brand + collapse */}
      <div
        className={cn(
          'flex shrink-0 items-center border-b border-sidebar-border',
          collapsed ? 'justify-center px-2 py-4' : 'justify-between gap-2 px-4 py-4',
        )}
      >
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
              Foodma
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-sidebar-foreground">
              {displayName}
            </p>
            {profile?.username && (
              <p className="truncate text-xs text-muted-foreground">@{profile.username}</p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Nav — scrolls only if many items */}
      <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
        <ul className="space-y-1">
          {navigation.map((item) => {
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
                    'flex items-center rounded-xl text-sm font-medium transition-colors',
                    collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-3 py-2.5',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground',
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="truncate">{item.name}</span>}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-sidebar-border p-2">
        <button
          type="button"
          onClick={() => void handleSignOut()}
          title={collapsed ? 'Sign out' : undefined}
          className={cn(
            'flex w-full items-center rounded-xl text-sm text-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-foreground',
            collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-3 py-2.5',
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  )
}
