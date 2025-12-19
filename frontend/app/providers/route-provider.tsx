'use client'

import { usePathname, useRouter } from 'next/navigation'
import { RouterProvider as AriaRouterProvider } from 'react-aria-components'

export function RouteProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <AriaRouterProvider navigate={path => router.push(path)} useHref={path => path}>
      {children}
    </AriaRouterProvider>
  )
}
