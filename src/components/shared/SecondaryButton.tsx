import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type SecondaryButtonProps = React.ComponentProps<'button'> & {
  children: ReactNode
  fullWidth?: boolean
}

export function SecondaryButton({
  children,
  className,
  fullWidth,
  ...props
}: SecondaryButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-soft transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
