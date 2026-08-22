import { cn } from '@/lib/utils'

type PillToggleProps = {
  label: string
  selected: boolean
  onClick: () => void
  className?: string
  disabled?: boolean
}

export function PillToggle({ label, selected, onClick, className, disabled }: PillToggleProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'rounded-full px-3.5 py-2 text-sm font-medium transition',
        selected
          ? 'bg-primary text-primary-foreground'
          : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      {label}
    </button>
  )
}
