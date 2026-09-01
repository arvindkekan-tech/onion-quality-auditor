import { Outlet } from 'react-router-dom'

export function AppShell() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <Outlet />
    </div>
  )
}
