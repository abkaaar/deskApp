import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuthStore } from '@/app/stores/authStore'
import { useRegisterStore } from '@/app/stores/registerStore'
import { Button } from '@/app/components/ui/button'
import { formatCurrency } from '@/lib/checkout/format'
import {
  lastFloatStorageKey,
  terminalStorageKey,
} from '@/lib/register/registerSessionService'

export function OpenRegisterPage() {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const open = useRegisterStore((s) => s.open)
  const loading = useRegisterStore((s) => s.loading)
  const error = useRegisterStore((s) => s.error)
  const clearError = useRegisterStore((s) => s.clearError)
  const session = useRegisterStore((s) => s.session)

  const defaults = useMemo(() => {
    const vendorId = profile?.id ?? ''
    const savedTerminal =
      vendorId && typeof localStorage !== 'undefined'
        ? localStorage.getItem(terminalStorageKey(vendorId))
        : null
    const savedFloat =
      vendorId && typeof localStorage !== 'undefined'
        ? localStorage.getItem(lastFloatStorageKey(vendorId))
        : null
    return {
      terminalId: savedTerminal || 'main',
      terminalName: savedTerminal === 'main' || !savedTerminal ? 'Main register' : savedTerminal,
      float: savedFloat && Number.isFinite(Number(savedFloat)) ? String(Number(savedFloat)) : '0',
    }
  }, [profile?.id])

  const [terminalId, setTerminalId] = useState(defaults.terminalId)
  const [terminalName, setTerminalName] = useState(defaults.terminalName)
  const [floatText, setFloatText] = useState(defaults.float)
  const [note, setNote] = useState('')

  useEffect(() => {
    setTerminalId(defaults.terminalId)
    setTerminalName(defaults.terminalName)
    setFloatText(defaults.float)
  }, [defaults])

  useEffect(() => {
    if (session) navigate('/', { replace: true })
  }, [session, navigate])

  const cashierName =
    profile?.business_name?.trim() ||
    profile?.name?.trim() ||
    profile?.username?.trim() ||
    profile?.email?.trim() ||
    'Cashier'

  const handleOpen = async () => {
    if (!profile?.id) return
    clearError()
    const openingFloat = Math.max(0, Number(floatText.replace(/,/g, '')) || 0)
    const ok = await open({
      vendorId: profile.id,
      terminalId: terminalId.trim() || 'main',
      terminalName: terminalName.trim() || 'Main register',
      cashierUserId: profile.id,
      cashierName,
      openingFloat,
      openingNote: note.trim() || undefined,
    })
    if (ok) navigate('/', { replace: true })
  }

  return (
    <div className="flex h-full min-h-0 items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-foreground">Open register</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Start a till session before recording sales. Opening float sets expected cash.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Cashier
            </label>
            <p className="mt-1 rounded-2xl border border-border bg-muted px-4 py-3 text-sm font-medium">
              {cashierName}
            </p>
          </div>

          <div>
            <label
              htmlFor="terminal-name"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Register / terminal
            </label>
            <input
              id="terminal-name"
              value={terminalName}
              onChange={(e) => {
                setTerminalName(e.target.value)
                setTerminalId(
                  e.target.value
                    .trim()
                    .toLowerCase()
                    .replace(/\s+/g, '-') || 'main',
                )
              }}
              className="mt-1 w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm"
              placeholder="Main register"
            />
          </div>

          <div>
            <label
              htmlFor="opening-float"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Opening cash float
            </label>
            <input
              id="opening-float"
              inputMode="decimal"
              value={floatText}
              onChange={(e) => setFloatText(e.target.value.replace(/[^\d.]/g, ''))}
              className="mt-1 w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm"
              placeholder="0"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Suggested:{' '}
              {formatCurrency(Math.max(0, Number(defaults.float) || 0))}
            </p>
          </div>

          <div>
            <label
              htmlFor="opening-note"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Opening note (optional)
            </label>
            <input
              id="opening-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm"
              placeholder="Opening adjustment…"
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
            type="button"
            disabled={loading || !profile?.id}
            onClick={() => void handleOpen()}
            className="w-full rounded-2xl bg-primary py-6 text-sm font-semibold text-primary-foreground"
          >
            {loading ? 'Opening…' : 'Open till'}
          </Button>
        </div>
      </div>
    </div>
  )
}
