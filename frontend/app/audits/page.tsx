'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../providers/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { ArrowRight, ArrowLeft } from '@untitledui/icons'
import { AppShell } from '@/components/app-shell'
import { getUserVerdicts } from '@/lib/arena-service'

interface VerdictItem {
  id: string
  ideaTitle?: string | null
  decision: string
  status: string
  createdAt?: string | null
  confidence?: number
  reasoning?: string
}

const decisionStyles: Record<string, { label: string; badge: string; color: string }> = {
  proceed: { label: 'Proceed', badge: 'success', color: 'text-emerald-600' },
  pivot: { label: 'Pivot', badge: 'warning', color: 'text-amber-600' },
  kill: { label: 'Kill', badge: 'destructive', color: 'text-rose-600' },
  'needs work': { label: 'Needs Work', badge: 'secondary', color: 'text-slate-600' },
}

function normalizeKey(value?: string) {
  return (value || '').trim().toLowerCase()
}

export default function AuditsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [verdicts, setVerdicts] = useState<VerdictItem[]>([])
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
      return
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return

    async function fetchVerdicts() {
      try {
        setPageLoading(true)
        setError(null)
        const data = await getUserVerdicts()

        data.sort((a, b) => {
          const aTs = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const bTs = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return bTs - aTs
        })

        setVerdicts(data as VerdictItem[])
      } catch (err: any) {
        setError(err?.message || 'Failed to load audits')
      } finally {
        setPageLoading(false)
      }
    }

    fetchVerdicts()
  }, [user])

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-16 text-slate-500">Loading...</div>
      </AppShell>
    )
  }

  if (!user) {
    return null
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Badge
              variant="secondary"
              className="w-fit border-0 bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white shadow-sm"
            >
              Audits
            </Badge>
            <div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
                Review your{' '}
                <span className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] bg-clip-text text-transparent">
                  audits
                </span>
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300 mt-2 max-w-2xl">
                Browse every PRD validation and verdict you’ve run so far.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard">
              <Button variant="secondary" size="sm">
                Dashboard
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

        {/* Error State */}
        {error && (
          <div className="mb-8 rounded-xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/30 p-4">
            <p className="font-semibold text-red-700 dark:text-red-300">Error</p>
            <p className="text-sm text-red-700/80 dark:text-red-300/80">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {pageLoading && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-300">Loading your audits...</p>
          </div>
        )}

        {/* Empty State */}
        {!pageLoading && verdicts.length === 0 && (
          <Card className="max-w-2xl mx-auto shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 text-center p-12">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Audits Yet</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Start by validating your first PRD idea on the home page!
            </p>
            <Link href="/validate">
              <Button className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)]">
                Validate Your First PRD
              </Button>
            </Link>
          </Card>
        )}

        {/* Audits Grid */}
        {!pageLoading && verdicts.length > 0 && (
          <>
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-300">
              {verdicts.length} audit{verdicts.length !== 1 ? 's' : ''} found
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {verdicts.map(verdict => {
                const normalizedDecision = normalizeKey(verdict.decision)
                const style = decisionStyles[normalizedDecision] || decisionStyles.proceed

                return (
                  <Card
                    key={verdict.id}
                    className="shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 overflow-hidden group cursor-pointer"
                  >
                    <Link href={`/verdict/${verdict.id}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant={style.badge as any}>{style.label}</Badge>
                          {verdict.confidence && (
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                              {Math.round(verdict.confidence)}% confident
                            </span>
                          )}
                        </div>
                        <CardTitle className="text-lg line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {verdict.ideaTitle || 'Untitled Idea'}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {verdict.createdAt
                            ? new Date(verdict.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Date unknown'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {verdict.reasoning && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-4">
                            {verdict.reasoning}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                            {verdict.id.slice(0, 8)}...
                          </span>
                          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                )
              })}
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
