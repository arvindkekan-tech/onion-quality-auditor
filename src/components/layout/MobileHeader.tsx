import { Wifi } from 'lucide-react'

import { APP_INSTITUTION, APP_NAME, APP_TAGLINE } from '@/lib/demo-data'
import { cn } from '@/lib/utils'

type MobileHeaderProps = {
  showBranding?: boolean
  showConnectivity?: boolean
  className?: string
}

export function MobileHeader({
  showBranding = true,
  showConnectivity = true,
  className,
}: MobileHeaderProps) {
  return (
    <header
      className={cn(
        'border-b border-border bg-card/80 px-4 py-4 backdrop-blur-sm',
        className,
      )}
    >
      {showBranding ? (
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-bold tracking-tight text-primary">{APP_NAME}</p>
            <p className="text-xs font-medium text-foreground">{APP_TAGLINE}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              {APP_INSTITUTION}
            </p>
          </div>
          {showConnectivity ? (
            <div className="flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1">
              <Wifi className="size-3 text-success" aria-hidden />
              <span className="text-[10px] font-medium text-success">Online</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  )
}
