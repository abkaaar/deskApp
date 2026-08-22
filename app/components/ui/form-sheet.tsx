import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function FormSheetBody({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>{children}</div>
  )
}

export function FormSheetScroll({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5', className)}>
      {children}
    </div>
  )
}

export function FormSheetFooter({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'shrink-0 border-t border-border bg-background px-5 py-4',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function FormField({
  label,
  children,
  hint,
  className,
}: {
  label: string
  children: ReactNode
  hint?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
      {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  )
}

/** Shared select styling for form sheets. */
export const formSelectClassName =
  'h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'

export const formTextareaClassName =
  'w-full rounded-xl border border-input bg-transparent px-3 py-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'
