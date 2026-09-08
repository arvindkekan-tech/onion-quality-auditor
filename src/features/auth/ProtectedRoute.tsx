import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export function ProtectedRoute() {
  const location = useLocation()
  const { isAuthenticated, isLoading, initAuth } = useAuthStore()

  useEffect(() => {
    initAuth()
  }, [initAuth])

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-slate-500 font-medium">Verifying authorization...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    if (location.pathname === '/' || location.pathname === '/welcome') {
      return <Navigate to="/welcome" replace />
    }
    return (
      <Navigate
        to="/login"
        state={{
          from: location,
          message: 'Officer authentication is required to access official APMC mandi records and reviews.',
        }}
        replace
      />
    )
  }

  return <Outlet />
}
