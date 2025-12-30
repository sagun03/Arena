'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/button'
import { Logo } from '@/components/logo'
import { useAuth } from '@/app/providers/auth-provider'
import { useCredits } from '@/app/providers/credits-provider'
import { cn } from '@/lib/utils'
import {
  Home01,
  LayoutGrid01,
  Check,
  Stars02,
  Menu01,
  XClose,
  ArrowLeft,
  ArrowRight,
  LogOut01,
} from '@untitledui/icons'

interface AppShellProps {
  children: ReactNode
  onValidateClick?: () => void
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid01 },
  { href: '/audits', label: 'My Audits', icon: Check },
  { href: '/active', label: 'Active', icon: Home01 },
  { href: '/validate', label: 'Validate Product', icon: Stars02 },
  { href: '/pricing', label: 'Credit Packs', icon: Stars02 },
]

export function AppShell({ children, onValidateClick }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, logout } = useAuth()
  const { credits, loading: creditsLoading } = useCredits()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleValidate = () => {
    if (onValidateClick) {
      onValidateClick()
      return
    }
    router.push('/validate')
  }

  const NavLinks = ({ condensed = false, onNav }: { condensed?: boolean; onNav?: () => void }) => (
    <div className="flex flex-col gap-1">
      {navItems.map(item => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => onNav?.()}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all',
              active
                ? 'bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white shadow'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <Icon className="h-4 w-4" />
            {!condensed && <span className="truncate">{item.label}</span>}
          </Link>
        )
      })}
    </div>
  )

  const AuthActions = () => (
    <div className="flex items-center gap-2">
      {loading ? (
        <div className="text-sm text-slate-500 px-2">Loading...</div>
      ) : user ? (
        <button
          onClick={logout}
          className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Sign out"
        >
          <LogOut01 className="h-4 w-4" />
        </button>
      ) : (
        <div className="flex gap-2 w-full">
          <Link href="/auth/login" className="flex-1">
            <Button variant="secondary" size="sm" className="w-full">
              Sign In
            </Button>
          </Link>
          <Link href="/auth/signup" className="flex-1">
            <Button size="sm" className="w-full">
              Sign Up
            </Button>
          </Link>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-gray-900 dark:text-white">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            'hidden lg:flex h-screen sticky top-0 left-0 flex-col gap-4 border-r border-slate-200/70 dark:border-slate-800/70 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-4 py-6 transition-all duration-200',
            sidebarCollapsed ? 'w-[92px]' : 'w-72'
          )}
        >
          <div className="flex items-center justify-between pr-1">
            <Link href="/" className="flex items-center gap-2">
              <Logo
                className={cn('w-auto', sidebarCollapsed ? 'h-12' : 'h-14')}
                markOnly={sidebarCollapsed}
                showTagline={!sidebarCollapsed}
              />
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto">
            {!sidebarCollapsed && (
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.16em] px-1 pb-2">
                Menu
              </p>
            )}
            <NavLinks condensed={sidebarCollapsed} />
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200/70 dark:border-slate-800/70 flex flex-col gap-2">
            {user && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-gray-900 px-4 py-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.14em] text-slate-500">
                  <span>Credits</span>
                  <span className="text-slate-900 dark:text-white font-semibold tracking-normal">
                    {creditsLoading ? '...' : (credits ?? 0)}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-3 w-full"
                  onClick={() => router.push('/pricing')}
                >
                  Buy Credits
                </Button>
              </div>
            )}
            <div className="flex items-center justify-between">
              {!sidebarCollapsed && (
                <span className="text-xs uppercase tracking-[0.14em] text-slate-500">Theme</span>
              )}
              <ThemeToggle />
            </div>
            <div className="flex items-center justify-between">
              {!sidebarCollapsed && (
                <span className="text-xs uppercase tracking-[0.14em] text-slate-500">Collapse</span>
              )}
              <button
                onClick={() => setSidebarCollapsed(c => !c)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-gray-900 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? (
                  <ArrowRight className="h-4 w-4" />
                ) : (
                  <ArrowLeft className="h-4 w-4" />
                )}
              </button>
            </div>
            <AuthActions />
          </div>
        </aside>

        <main className="flex-1 min-w-0 lg:max-h-screen lg:overflow-y-auto">
          <div className="lg:hidden px-4 pt-4 flex items-center justify-between">
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-gray-900"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu01 className="h-4 w-4" />
            </button>
            <Link href="/" className="flex items-center gap-2">
              <Logo className="h-12 w-auto" markOnly />
            </Link>
          </div>

          <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-10">{children}</div>
        </main>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="relative h-full w-80 max-w-[80vw] bg-white dark:bg-gray-900 border-r border-slate-200 dark:border-slate-800 p-6 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Logo className="h-12 w-auto" showTagline />
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="h-10 w-10 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800"
                aria-label="Close navigation"
              >
                <XClose className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavLinks onNav={() => setMobileOpen(false)} />
            </div>
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <ThemeToggle />
              <AuthActions />
            </div>
            {user && (
              <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-gray-900 px-4 py-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.14em] text-slate-500">
                  <span>Credits</span>
                  <span className="text-slate-900 dark:text-white font-semibold tracking-normal">
                    {creditsLoading ? '...' : (credits ?? 0)}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-3 w-full"
                  onClick={() => {
                    setMobileOpen(false)
                    router.push('/pricing')
                  }}
                >
                  Buy Credits
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
