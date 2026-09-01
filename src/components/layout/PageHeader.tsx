import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type PageHeaderProps = {
  title: string
  subtitle?: string
  backTo?: string
}

export function PageHeader({ title, subtitle, backTo }: PageHeaderProps) {
  return (
    <header className="flex items-start gap-3 border-b px-4 py-4">
      {backTo ? (
        <Link
          to={backTo}
          aria-label="Go back"
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
        >
          <ArrowLeft />
        </Link>
      ) : (
        <div className="size-8" />
      )}
      <div className="flex-1">
        <h1 className="text-lg font-semibold">{title}</h1>
        {subtitle ? (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </header>
  )
}
