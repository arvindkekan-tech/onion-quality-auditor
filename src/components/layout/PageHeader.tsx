import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'

type PageHeaderProps = {
  title: string
  subtitle?: string
  backTo?: string
  className?: string
}

export function PageHeader({ title, subtitle, backTo, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex items-start gap-3 border-b border-border bg-card px-4 py-3',
        className,
      )}
    >
      {backTo ? (
        <Link
          to={backTo}
          aria-label="Go back"
          className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
      ) : (
        <div className="size-10 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </header>
  )
}
