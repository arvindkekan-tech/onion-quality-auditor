import { Outlet, useLocation } from 'react-router-dom'

import { BottomNavigation } from '@/components/layout/BottomNavigation'
import { isInspectionFlowPath } from '@/lib/constants'
import { cn } from '@/lib/utils'

export function AppShell() {
  const { pathname } = useLocation()
  const showBottomNav = !isInspectionFlowPath(pathname)

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <div className={cn('flex flex-1 flex-col', showBottomNav && 'pb-20')}>
        <Outlet />
      </div>
      {showBottomNav ? <BottomNavigation /> : null}
    </div>
  )
}
