import {
  createPublicSupabaseClient,
  getSupabaseAnonKey,
} from '@/lib/supabase/client'

export type EmailSignInResult =
  | { ok: true; email: string; maskedEmail: string }
  | {
      ok: false
      code?:
        | 'not_registered'
        | 'no_phone'
        | 'invalid_email'
        | 'send_failed'
        | 'rate_limited'
      message: string
    }

type EmailSignInCode = NonNullable<Extract<EmailSignInResult, { ok: false }>['code']>

type EmailSignInResponse = {
  success: boolean
  email?: string
  masked_email?: string
  /** Compat from edge during migration */
  masked_phone?: string
  phone?: string
  error?: string
  code?: EmailSignInCode
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FUNCTION_CODES = new Set<EmailSignInCode>([
  'not_registered',
  'no_phone',
  'invalid_email',
  'send_failed',
  'rate_limited',
])
const REACHABILITY_ERROR = 'Could not reach sign-in service'

export function isValidSignInEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim())
}

export function maskEmailAddress(email: string): string {
  const trimmed = email.trim().toLowerCase()
  const [local, domain] = trimmed.split('@')
  if (!local || !domain) return '***'
  const visible = local.slice(0, Math.min(2, local.length))
  return `${visible}***@${domain}`
}

function isFunctionPayload(value: unknown): value is EmailSignInResponse {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  if (typeof record.success === 'boolean') return true
  return typeof record.code === 'string' && FUNCTION_CODES.has(record.code as EmailSignInCode)
}

function parseErrorBody(
  error: { message?: string; context?: unknown } | null,
): unknown {
  const context = error?.context as
    | { body?: string | EmailSignInResponse }
    | undefined

  if (!context?.body) return null

  if (typeof context.body === 'string') {
    try {
      return JSON.parse(context.body)
    } catch {
      return null
    }
  }

  return context.body
}

function invokeDiagnostic(
  error: { message?: string; name?: string; context?: unknown } | null,
): string {
  const context = error?.context as { status?: number } | undefined
  if (typeof context?.status === 'number') return `http_${context.status}`
  if (error?.name === 'FunctionsFetchError') return 'fetch_failed'
  if (error?.message?.toLowerCase().includes('jwt')) return 'http_401'
  return 'invoke_failed'
}

function messageForFunctionError(payload: EmailSignInResponse): string {
  if (payload.code === 'not_registered') {
    return payload.error || 'No account found with this email'
  }
  if (payload.code === 'invalid_email') {
    return payload.error || 'Please enter a valid email address'
  }
  if (payload.code === 'no_phone') {
    return payload.error || 'Account phone number is invalid'
  }
  if (payload.code === 'rate_limited') {
    return (
      payload.error ||
      'Too many codes requested. Wait a minute and try again.'
    )
  }
  if (payload.code === 'send_failed') {
    return payload.error || 'Failed to send verification code'
  }
  return payload.error || 'Could not start sign in'
}

export async function requestEmailSignInOtp(
  email: string,
): Promise<EmailSignInResult> {
  const trimmed = email.trim().toLowerCase()
  if (!trimmed) {
    return { ok: false, code: 'invalid_email', message: 'Email is required' }
  }
  if (!isValidSignInEmail(trimmed)) {
    return {
      ok: false,
      code: 'invalid_email',
      message: 'Please enter a valid email address',
    }
  }

  try {
    const supabase = createPublicSupabaseClient()
    const anonKey = getSupabaseAnonKey()
    const { data, error } = await supabase.functions.invoke<EmailSignInResponse>(
      'email-sign-in',
      {
        body: { email: trimmed },
        headers: {
          Authorization: `Bearer ${anonKey}`,
          apikey: anonKey,
        },
      },
    )

    const parsedErrorBody = parseErrorBody(error)
    const payload =
      (isFunctionPayload(data) ? data : null) ||
      (isFunctionPayload(parsedErrorBody) ? parsedErrorBody : null)

    if (payload?.success) {
      const resolvedEmail = (payload.email || payload.phone || trimmed)
        .trim()
        .toLowerCase()
      return {
        ok: true,
        email: resolvedEmail,
        maskedEmail:
          payload.masked_email ||
          payload.masked_phone ||
          maskEmailAddress(resolvedEmail),
      }
    }

    if (payload && payload.success === false) {
      return {
        ok: false,
        code: payload.code,
        message: messageForFunctionError(payload),
      }
    }

    console.warn('[email-sign-in] invoke failed:', invokeDiagnostic(error))
    return {
      ok: false,
      message: REACHABILITY_ERROR,
    }
  } catch {
    console.warn('[email-sign-in] invoke failed: exception')
    return {
      ok: false,
      message: REACHABILITY_ERROR,
    }
  }
}
