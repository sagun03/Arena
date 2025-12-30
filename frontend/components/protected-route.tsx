'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers/auth-provider'

interface ProtectedRouteProps {
  children: React.ReactNode
  loadingFallback?: React.ReactNode
}

/** Client-side gate for private routes. Redirects to login with ?redirect=<path> when not authenticated. */
export function ProtectedRoute({ children, loadingFallback }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) {
      const redirect = encodeURIComponent(pathname || '/')
      router.replace(`/auth/login?redirect=${redirect}`)
    }
  }, [loading, user, router, pathname])

  if (loading) {
    return (
      loadingFallback || (
        <div className="flex min-h-[60vh] items-center justify-center text-slate-500">
          Loading...
        </div>
      )
    )
  }

  if (!user) return null

  return <>{children}</>
}
