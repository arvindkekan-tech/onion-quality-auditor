import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react'

import { cn } from '@/lib/utils'

type AlertBannerProps = {
  variant: 'success' | 'warning' | 'error' | 'info'
  title?: string
  children: React.ReactNode
  className?: string
}

const variantStyles = {
  success: 'border-success/20 bg-success/5 text-success',
  warning: 'border-warning/20 bg-accent text-accent-foreground',
  error: 'border-destructive/20 bg-destructive/5 text-destructive',
  info: 'border-info/20 bg-info/5 text-info',
}

const icons = {
  success: CheckCircle2,
  warning: TriangleAlert,
  error: AlertCircle,
  info: Info,
}

export function AlertBanner({
  variant,
  title,
  children,
  className,
}: AlertBannerProps) {
  const Icon = icons[variant]
  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 rounded-xl border p-3 text-sm',
        variantStyles[variant],
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>
        {title ? <p className="font-medium">{title}</p> : null}
        <div className={cn(title && 'mt-1', 'text-xs leading-relaxed opacity-90')}>
          {children}
        </div>
      </div>
    </div>
  )
}
