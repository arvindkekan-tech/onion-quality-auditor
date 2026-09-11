import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'

import { router } from '@/app/router'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

export function AppProviders() {
  useEffect(() => {
    try {
      const redirect = sessionStorage.getItem('onivis_spa_redirect')
      if (redirect) {
        sessionStorage.removeItem('onivis_spa_redirect')
        if (redirect !== '/' && redirect !== window.location.pathname) {
          router.navigate(redirect, { replace: true })
        }
      }
    } catch (_) {}
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
