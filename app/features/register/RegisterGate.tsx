import { useEffect, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuthStore } from '@/app/stores/authStore'
import { useRegisterStore } from '@/app/stores/registerStore'

type RegisterGateProps = {
  children: ReactNode
}

/** Blocks checkout/sales routes until a till session is open. */
export function RegisterGate({ children }: RegisterGateProps) {
  const location = useLocation()
  const profile = useAuthStore((s) => s.profile)
  const session = useRegisterStore((s) => s.session)
  const initialized = useRegisterStore((s) => s.initialized)
  const loading = useRegisterStore((s) => s.loading)
  const initialize = useRegisterStore((s) => s.initialize)

  useEffect(() => {
    if (profile?.id) void initialize(profile.id)
  }, [profile?.id, initialize])

  const path = location.pathname
  const isRegisterRoute =
    path.startsWith('/register/open') || path.startsWith('/register/close')

  if (!initialized || loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading register…
      </div>
    )
  }

  if (!session && !isRegisterRoute) {
    return <Navigate to="/register/open" replace />
  }

  if (session && path.startsWith('/register/open')) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
