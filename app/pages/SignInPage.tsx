import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, Mail } from 'lucide-react'

import brandLogo from '@/resources/icons/logo.png'
import { useAuthStore } from '@/app/stores/authStore'
import { Button } from '@/app/components/ui/button'
import {
  AUTH_ERRORS,
  isValidOtpCode,
  MAX_OTP_ATTEMPTS,
  OTP_RESEND_SECONDS,
} from '@/lib/auth/auth-security'
import { isValidSignInEmail, maskEmailAddress } from '@/lib/auth/email-sign-in'
import { isTestEmail, TEST_OTP } from '@/lib/auth/test-auth'

type Mode = 'owner' | 'staff'
type Step = 'email' | 'otp'

export function SignInPage() {
  const navigate = useNavigate()
  const status = useAuthStore((s) => s.status)
  const initialized = useAuthStore((s) => s.initialized)
  const error = useAuthStore((s) => s.error)
  const pendingEmail = useAuthStore((s) => s.pendingEmail)
  const maskedEmail = useAuthStore((s) => s.maskedEmail)
  const initialize = useAuthStore((s) => s.initialize)
  const sendOtp = useAuthStore((s) => s.sendOtp)
  const verifyOtp = useAuthStore((s) => s.verifyOtp)
  const signInStaff = useAuthStore((s) => s.signInStaff)
  const clearError = useAuthStore((s) => s.clearError)
  const resetPending = useAuthStore((s) => s.resetPending)

  const [mode, setMode] = useState<Mode>('owner')
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [otpAttempts, setOtpAttempts] = useState(0)

  useEffect(() => {
    void initialize()
  }, [initialize])

  useEffect(() => {
    if (initialized && status === 'authenticated') {
      navigate('/', { replace: true })
    }
  }, [initialized, status, navigate])

  useEffect(() => {
    if (resendTimer <= 0) return
    const timer = setTimeout(() => setResendTimer((t) => t - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendTimer])

  const handleSendOtp = useCallback(async () => {
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail || !isValidSignInEmail(normalizedEmail)) {
      useAuthStore.setState({ error: AUTH_ERRORS.invalidEmail })
      return
    }

    setLoading(true)
    try {
      const ok = await sendOtp(normalizedEmail)
      if (ok) {
        setStep('otp')
        setOtp('')
        setOtpAttempts(0)
        setResendTimer(OTP_RESEND_SECONDS)
      }
    } finally {
      setLoading(false)
    }
  }, [email, sendOtp])

  const handleVerifyOtp = useCallback(async () => {
    if (!isValidOtpCode(otp)) {
      useAuthStore.setState({ error: AUTH_ERRORS.invalidOtp })
      return
    }

    if (otpAttempts >= MAX_OTP_ATTEMPTS) {
      useAuthStore.setState({ error: AUTH_ERRORS.tooManyAttempts })
      return
    }

    setOtpAttempts((attempts) => attempts + 1)
    setLoading(true)
    try {
      const ok = await verifyOtp(otp.trim())
      if (ok) {
        navigate('/', { replace: true })
      } else {
        setOtp('')
      }
    } finally {
      setLoading(false)
    }
  }, [otp, otpAttempts, verifyOtp, navigate])

  const handleStaffSignIn = useCallback(async () => {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !isValidSignInEmail(normalizedEmail)) {
      useAuthStore.setState({ error: AUTH_ERRORS.invalidEmail })
      return
    }
    if (!accessCode.trim()) {
      useAuthStore.setState({ error: 'Enter the access code from your manager' })
      return
    }

    setLoading(true)
    try {
      const ok = await signInStaff(normalizedEmail, accessCode.trim())
      if (ok) {
        navigate('/', { replace: true })
      }
    } finally {
      setLoading(false)
    }
  }, [email, accessCode, signInStaff, navigate])

  const handleResend = useCallback(async () => {
    if (resendTimer > 0 || loading) return
    setOtpAttempts(0)
    await handleSendOtp()
  }, [resendTimer, loading, handleSendOtp])

  const handleChangeEmail = useCallback(() => {
    resetPending()
    setStep('email')
    setOtp('')
    setOtpAttempts(0)
  }, [resetPending])

  if (!initialized || status === 'loading') {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-background text-muted-foreground">
        <p className="text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-xl">
        <div className="mb-6 text-center">
          <img
            src={brandLogo}
            alt="Foodpos"
            className="mx-auto h-12 w-12 rounded-2xl object-contain"
          />
          <h1 className="mt-3 text-2xl font-semibold text-foreground">
            Sign in to your restaurant
          </h1>
        </div>

        <div className="mb-6 inline-flex w-full rounded-full bg-muted p-1">
          <button
            type="button"
            onClick={() => {
              setMode('owner')
              clearError()
              setStep('email')
            }}
            className={
              mode === 'owner'
                ? 'flex-1 rounded-full bg-card px-3 py-2 text-sm font-semibold shadow-sm'
                : 'flex-1 rounded-full px-3 py-2 text-sm text-muted-foreground'
            }
          >
            Owner
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('staff')
              clearError()
              resetPending()
              setStep('email')
            }}
            className={
              mode === 'staff'
                ? 'flex-1 rounded-full bg-card px-3 py-2 text-sm font-semibold shadow-sm'
                : 'flex-1 rounded-full px-3 py-2 text-sm text-muted-foreground'
            }
          >
            Staff
          </button>
        </div>

        {mode === 'staff' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void handleStaffSignIn()
            }}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="staff-email"
                className="block text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground"
              >
                Staff email
              </label>
              <div className="relative mt-2 rounded-2xl border border-border bg-muted">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="staff-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    clearError()
                  }}
                  required
                  className="w-full rounded-2xl border-none bg-transparent px-12 py-4 text-sm focus:outline-none"
                  placeholder="you@restaurant.com"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="staff-code"
                className="block text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground"
              >
                Access code
              </label>
              <div className="relative mt-2 rounded-2xl border border-border bg-muted">
                <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="staff-code"
                  type="text"
                  autoComplete="off"
                  value={accessCode}
                  onChange={(e) => {
                    setAccessCode(e.target.value.toUpperCase())
                    clearError()
                  }}
                  required
                  className="w-full rounded-2xl border-none bg-transparent px-12 py-4 font-mono text-sm tracking-widest focus:outline-none"
                  placeholder="XXXXXXXXXX"
                />
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !email.trim() || !accessCode.trim()}
              className="w-full rounded-2xl bg-primary py-6 text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground hover:bg-primary-dark"
            >
              {loading ? 'Signing in…' : 'Sign in as staff'}
            </Button>
          </form>
        ) : step === 'email' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void handleSendOtp()
            }}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="sign-in-email"
                className="block text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground"
              >
                Email address
              </label>
              <div className="relative mt-2 rounded-2xl border border-border bg-muted">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="sign-in-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    clearError()
                  }}
                  required
                  className="w-full rounded-2xl border-none bg-transparent px-12 py-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  placeholder="you@restaurant.com"
                />
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !email.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-6 text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground hover:bg-primary-dark"
            >
              <Mail className="h-4 w-4" />
              {loading ? 'Sending code…' : 'Continue'}
            </Button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void handleVerifyOtp()
            }}
            className="space-y-5"
          >
            <div className="rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
              Code sent to{' '}
              <span className="font-semibold">
                {maskedEmail || maskEmailAddress(pendingEmail)}
              </span>
              {isTestEmail(pendingEmail) && (
                <p className="mt-2 text-xs text-success/90">
                  Review account: use verification code{' '}
                  <span className="font-mono font-semibold">{TEST_OTP}</span>
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="sign-in-otp"
                className="block text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground"
              >
                Verification code
              </label>
              <input
                id="sign-in-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                  clearError()
                }}
                required
                autoFocus
                className="mt-2 w-full rounded-2xl border border-border bg-muted px-4 py-4 text-center text-2xl font-semibold tracking-[0.35em] text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                placeholder="••••••"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || otpAttempts >= MAX_OTP_ATTEMPTS}
              className="w-full rounded-2xl bg-primary py-6 text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground hover:bg-primary-dark"
            >
              {loading ? 'Verifying…' : 'Sign in'}
            </Button>

            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <button
                type="button"
                onClick={handleChangeEmail}
                className="font-semibold text-primary hover:text-primary-light"
              >
                Change email
              </button>
              <button
                type="button"
                onClick={() => void handleResend()}
                disabled={resendTimer > 0 || loading}
                className="font-semibold text-primary hover:text-primary-light disabled:text-muted-foreground/50"
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
