'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getUserVerdicts } from '@/lib/arena-service'
import { useAuth } from '../providers/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { AppShell } from '@/components/app-shell'
import { ProtectedRoute } from '@/components/protected-route'
import { ArrowRight, ArrowUpRight } from '@untitledui/icons'

interface RecentVerdictItem {
  id: string
  ideaTitle?: string | null
  decision?: string
  status: string
  createdAt?: string | null
  confidence?: number
  reasoning?: string
}

interface Stats {
  total: number
  completed: number
  pending: number
}

function formatDate(ts?: string | null) {
  if (!ts) return 'Date unknown'
  return new Date(ts).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [recentVerdicts, setRecentVerdicts] = useState<RecentVerdictItem[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, completed: 0, pending: 0 })
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    async function loadData() {
      try {
        setPageLoading(true)
        setError(null)
        const verdicts = await getUserVerdicts()

        // Recent: first 5 (API returns most recent first)
        setRecentVerdicts(verdicts.slice(0, 5))

        // Stats: derive from same data
        let completed = 0
        let pending = 0
        verdicts.forEach(v => {
          const status = (v.status || '').toLowerCase()
          if (status === 'completed') completed += 1
          else pending += 1
        })
        setStats({ total: verdicts.length, completed, pending })
      } catch (err: any) {
        setError(err?.message || 'Failed to load dashboard')
      } finally {
        setPageLoading(false)
      }
    }
    loadData()
  }, [user])

  const userName = user?.displayName || user?.email || 'there'

  return (
    <ProtectedRoute
      loadingFallback={
        <AppShell>
          <div className="flex items-center justify-center py-16 text-slate-500">Loading...</div>
        </AppShell>
      }
    >
      <AppShell>
        <div className="space-y-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <Badge
                variant="secondary"
                className="w-fit border-0 bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white shadow-sm"
              >
                Dashboard
              </Badge>
              <div>
                <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
                  Welcome back,{' '}
                  <span className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] bg-clip-text text-transparent">
                    {userName}
                  </span>
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-300 mt-2 max-w-2xl">
                  Track validations, review audits, and kick off new debates.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/audits">
                <Button variant="secondary" size="sm">
                  My Audits
                </Button>
              </Link>
              <Link href="/validate">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)]"
                >
                  Validate PRD
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>

          {error && (
            <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/30">
              <CardContent className="pt-6">
                <p className="font-semibold text-red-700 dark:text-red-300">Error</p>
                <p className="text-sm text-red-700/80 dark:text-red-300/80">{error}</p>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="shadow-sm">
              <CardHeader>
                <CardDescription>Total Audits</CardDescription>
                <CardTitle className="text-3xl">{stats.total}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="shadow-sm">
              <CardHeader>
                <CardDescription>Completed</CardDescription>
                <CardTitle className="text-3xl text-emerald-600">{stats.completed}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="shadow-sm">
              <CardHeader>
                <CardDescription>Pending / Running</CardDescription>
                <CardTitle className="text-3xl text-amber-600">{stats.pending}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card className="shadow-lg">
            <CardHeader className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Recent Audits</CardTitle>
                <CardDescription>Your latest validations</CardDescription>
              </div>
              <Link href="/audits">
                <Button variant="secondary" size="sm">
                  See all
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {pageLoading ? (
                <p className="text-gray-600 dark:text-gray-300">Loading recent audits...</p>
              ) : recentVerdicts.length === 0 ? (
                <div className="text-center py-8 text-gray-600 dark:text-gray-300">
                  No audits yet. Start by validating your first PRD.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recentVerdicts.map(verdict => {
                    const decisionLower = (verdict.decision || '').toLowerCase()
                    let badgeVariant: any = 'secondary'
                    if (decisionLower === 'proceed') badgeVariant = 'success'
                    else if (decisionLower === 'pivot') badgeVariant = 'warning'
                    else if (decisionLower === 'kill') badgeVariant = 'destructive'

                    return (
                      <Link key={verdict.id} href={`/verdict/${verdict.id}`}>
                        <Card className="shadow-sm hover:shadow-xl transition-all border border-slate-200/60 dark:border-slate-800/60">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <Badge variant={badgeVariant}>{verdict.decision || 'Unknown'}</Badge>
                              {verdict.confidence && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {Math.round(verdict.confidence)}%
                                </span>
                              )}
                            </div>
                            <CardTitle className="text-lg line-clamp-2">
                              {verdict.ideaTitle || 'Untitled Idea'}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {formatDate(verdict.createdAt)}
                            </CardDescription>
                          </CardHeader>
                          {verdict.reasoning && (
                            <CardContent>
                              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                                {verdict.reasoning}
                              </p>
                            </CardContent>
                          )}
                        </Card>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg bg-gradient-to-r from-[var(--brand-gradient-start)]/10 to-[var(--brand-gradient-end)]/10 border-0">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">Keep momentum</CardTitle>
                <CardDescription>Re-run a validation or review transcripts.</CardDescription>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/validate">
                  <Button className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)]">
                    Start new validation
                    <ArrowUpRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/audits">
                  <Button variant="secondary">Review past audits</Button>
                </Link>
              </div>
            </CardHeader>
          </Card>
        </div>
      </AppShell>
    </ProtectedRoute>
  )
}
