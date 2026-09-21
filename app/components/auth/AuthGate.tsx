import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuthStore } from '@/app/stores/authStore'

type Props = {
  children: React.ReactNode
}

export function AuthGate({ children }: Props) {
  const location = useLocation()
  const status = useAuthStore((s) => s.status)
  const initialized = useAuthStore((s) => s.initialized)
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    void initialize()
  }, [initialize])

  if (!initialized || status === 'loading') {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-background text-muted-foreground">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm">Loading FoodPos...</p>
        </div>
      </div>
    )
  }

  if (status !== 'authenticated') {
    return <Navigate to="/sign-in" state={{ from: location }} replace />
  }

  return <>{children}</>
}
