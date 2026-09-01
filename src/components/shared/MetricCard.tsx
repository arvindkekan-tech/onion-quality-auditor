import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

type MetricCardProps = {
  label: string
  value: string | number
  icon?: LucideIcon
  suffix?: string
  className?: string
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  suffix,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-3 shadow-soft',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon ? <Icon className="size-4 text-primary/70" aria-hidden /> : null}
      </div>
      <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">
        {value}
        {suffix ? (
          <span className="ml-0.5 text-sm font-medium text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </p>
    </div>
  )
}
