'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card'
import { getActiveDebates } from '@/lib/arena-service'
import { useAuth } from '../providers/auth-provider'

interface ActiveDebateItem {
  id: string
  ideaTitle?: string | null
  status: string
  createdAt?: string | null
}

function formatDate(ts?: string | null) {
  if (!ts) return 'Date unknown'
  return new Date(ts).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ActiveValidationsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<ActiveDebateItem[]>([])
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login?redirect=/active')
    }
  }, [loading, user, router])

  useEffect(() => {
    if (!user) return
    async function loadActive() {
      try {
        setPageLoading(true)
        setError(null)
        const data = await getActiveDebates()
        setItems(data)
      } catch (err: any) {
        setError(err?.message || 'Failed to load active validations')
      } finally {
        setPageLoading(false)
      }
    }
    loadActive()
  }, [user])

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-16 text-slate-500">Loading...</div>
      </AppShell>
    )
  }

  if (!user) return null

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Badge
              variant="secondary"
              className="w-fit border-0 bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white shadow-sm"
            >
              Active validations
            </Badge>
            <div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
                Resume your debates
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300 mt-2 max-w-2xl">
                Pick up any pending or running validation and jump back into the debate or verdict.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/validate">
              <Button size="sm" variant="secondary">
                Start new validation
              </Button>
            </Link>
            <Link href="/audits">
              <Button
                size="sm"
                className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)]"
              >
                View all audits
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/30 p-4">
            <p className="font-semibold text-red-700 dark:text-red-300">{error}</p>
            <p className="text-sm text-red-700/80 dark:text-red-300/80">
              Please try again or refresh.
            </p>
          </div>
        )}

        {pageLoading && (
          <div className="text-center py-12 text-slate-600 dark:text-slate-300">
            Loading active validations…
          </div>
        )}

        {!pageLoading && items.length === 0 && (
          <Card className="max-w-2xl mx-auto shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 text-center p-12">
            <div className="text-5xl mb-4">⏳</div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              No active validations
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Start a new validation to see it appear here while it runs.
            </p>
            <Link href="/validate">
              <Button className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)]">
                Validate now
              </Button>
            </Link>
          </Card>
        )}

        {!pageLoading && items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(item => (
              <Card
                key={item.id}
                className="shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/60"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Badge variant="secondary">{item.status || 'pending'}</Badge>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                  <CardTitle className="text-lg line-clamp-2">
                    {item.ideaTitle || 'Untitled idea'}
                  </CardTitle>
                  <CardDescription className="text-xs">ID: {item.id}</CardDescription>
                </CardHeader>
                <CardContent className="flex gap-3">
                  <Link href={`/debate/${item.id}`}>
                    <Button variant="secondary" size="sm" className="flex-1">
                      Debate
                    </Button>
                  </Link>
                  <Link href={`/verdict/${item.id}`}>
                    <Button
                      size="sm"
                      className="flex-1 bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)]"
                    >
                      Verdict
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
