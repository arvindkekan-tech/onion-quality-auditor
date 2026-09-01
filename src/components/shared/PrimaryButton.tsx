import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type PrimaryButtonProps = React.ComponentProps<'button'> & {
  children: ReactNode
  fullWidth?: boolean
}

export function PrimaryButton({
  children,
  className,
  fullWidth,
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
