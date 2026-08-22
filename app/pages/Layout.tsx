import { useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

import { AppSidebar } from '@/app/components/layout/Sidebar'
import { cn } from '@/lib/utils'

type LayoutProps = {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const isCheckout =
    location.pathname === '/' || location.pathname.startsWith('/checkout')

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-background">
      <AppSidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((prev) => !prev)}
      />
      <main
        className={cn(
          'min-h-0 min-w-0 flex-1 overflow-hidden',
          isCheckout ? 'p-0' : 'overflow-y-auto p-6',
        )}
      >
        {children}
      </main>
    </div>
  )
}
