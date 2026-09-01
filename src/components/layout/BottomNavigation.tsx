import { BarChart3, ClipboardList, Home, Plus, User } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import { NAV_ITEMS, ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'

const iconMap = {
  dashboard: Home,
  inspections: ClipboardList,
  new: Plus,
  analytics: BarChart3,
  profile: User,
} as const

export function BottomNavigation() {
  const { pathname } = useLocation()

  return (
    <nav
      aria-label="Main navigation"
      className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-md items-end justify-around px-2 pb-2 pt-1.5">
        {NAV_ITEMS.map((item) => {
          const Icon = iconMap[item.key as keyof typeof iconMap]
          const isActive =
            item.path === ROUTES.dashboard
              ? pathname === ROUTES.dashboard
              : pathname.startsWith(item.path) &&
                item.path !== ROUTES.newInspection

          if ('primary' in item && item.primary) {
            return (
              <Link
                key={item.key}
                to={item.path}
                className="relative -mt-4 flex flex-col items-center"
                aria-label={item.label}
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="mt-1 text-[10px] font-semibold text-primary">
                  {item.label}
                </span>
              </Link>
            )
          }

          return (
            <Link
              key={item.key}
              to={item.path}
              className={cn(
                'flex min-h-11 min-w-[60px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1 transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="size-5" aria-hidden />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
