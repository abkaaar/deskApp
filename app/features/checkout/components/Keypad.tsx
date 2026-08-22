import { Delete } from 'lucide-react'

import { cn } from '@/lib/utils'

type KeypadProps = {
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
  maxLength?: number
  showDecimal?: boolean
  className?: string
}

const DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
] as const

function appendDigit(current: string, digit: string, maxLength: number): string {
  if (current === '0' && digit !== '.') {
    return digit
  }

  const next = current + digit
  if (next.replace('.', '').length > maxLength) return current
  return next
}

export function Keypad({
  value,
  onChange,
  onSubmit,
  maxLength = 10,
  showDecimal = true,
  className,
}: KeypadProps) {
  const handleDigit = (digit: string) => {
    if (digit === '.' && (!showDecimal || value.includes('.'))) return
    onChange(appendDigit(value, digit, maxLength))
  }

  const handleBackspace = () => {
    onChange(value.slice(0, -1))
  }

  const handleClear = () => {
    onChange('')
  }

  return (
    <div className={cn('grid gap-1', className)}>
      {DIGIT_ROWS.map((row) => (
        <div key={row.join('-')} className="grid grid-cols-3 gap-1">
          {row.map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-12 rounded-xl bg-muted text-xl font-semibold text-foreground transition hover:bg-accent active:scale-[0.98]"
            >
              {digit}
            </button>
          ))}
        </div>
      ))}

      <div className="grid grid-cols-3 gap-2">
        {showDecimal ? (
          <button
            type="button"
            onClick={() => handleDigit('.')}
            className="h-14 rounded-xl bg-muted text-xl font-semibold text-foreground transition hover:bg-accent active:scale-[0.98]"
          >
            .
          </button>
        ) : (
          <button
            type="button"
            onClick={handleClear}
            className="h-14 rounded-xl bg-muted text-sm font-medium text-muted-foreground transition hover:bg-accent active:scale-[0.98]"
          >
            Clear
          </button>
        )}
        <button
          type="button"
          onClick={() => handleDigit('0')}
          className="h-14 rounded-xl bg-muted text-xl font-semibold text-foreground transition hover:bg-accent active:scale-[0.98]"
        >
          0
        </button>
        <button
          type="button"
          onClick={handleBackspace}
          aria-label="Backspace"
          className="flex h-14 items-center justify-center rounded-xl bg-muted text-foreground transition hover:bg-accent active:scale-[0.98]"
        >
          <Delete className="h-5 w-5" />
        </button>
      </div>

      {onSubmit && (
        <button
          type="button"
          onClick={onSubmit}
          className="mt-1 h-12 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary-dark active:scale-[0.98]"
        >
          Enter
        </button>
      )}
    </div>
  )
}
