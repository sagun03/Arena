'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { Section, Container } from '@/components/section'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { AppShell } from '@/components/app-shell'
import { getDebateState } from '@/lib/arena-service'
import { useAuth } from '@/app/providers/auth-provider'

type DebateState = {
  debate_id: string
  status: string
  transcript: Array<any>
  error?: string | null
  idea_title?: string
}

export default function DebatePage() {
  const params = useParams<{ id: string }>()
  const id = (params?.id as string) || ''
  const [state, setState] = useState<DebateState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [polling, setPolling] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [showRawState, setShowRawState] = useState(false)
  const prevHashRef = useRef<string | null>(null)
  // Auth guard
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { user, loading: authLoading } = useAuth()

  async function fetchState(opts: { silent?: boolean } = {}) {
    const { silent = false } = opts
    try {
      if (!silent) setLoading(true)
      setError(null)
      const data = await getDebateState(id)
      const hash = JSON.stringify(data)
      if (hash !== prevHashRef.current) {
        prevHashRef.current = hash
        setState(data)
        setLastUpdated(new Date().toLocaleTimeString())
      }
    } catch (err: any) {
      const message = err?.response?.data?.detail || err?.message || 'Failed to fetch debate state'
      setError(message)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    if (!id || !user || authLoading) return
    fetchState()
    const interval = setInterval(() => {
      if (polling) fetchState({ silent: true })
    }, 5000)
    return () => clearInterval(interval)
  }, [id, polling, user, authLoading])

  useEffect(() => {
    if (state?.status === 'completed') {
      setPolling(false)
    }
  }, [state])

  return (
    <AppShell>
      <Section className="py-8 sm:py-12 md:py-16">
        <Container>
          {/* Page Header */}
          <div className="mb-10 space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <Badge
                  variant="secondary"
                  className="w-fit border-0 bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white shadow-sm"
                >
                  Debate Transcript
                </Badge>
                <div>
                  <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
                    Live analysis
                  </h1>
                  <p className="text-lg text-slate-600 dark:text-slate-300">
                    Watch agents challenge your idea in real-time.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={fetchState}
                  className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white"
                >
                  Refresh
                </Button>
                <Button
                  onClick={() => setPolling(p => !p)}
                  size="sm"
                  className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white"
                >
                  {polling ? 'Auto-refresh: On' : 'Auto-refresh: Off'}
                </Button>
                <a href={`/verdict/${id}`}>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)]"
                  >
                    View verdict
                  </Button>
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardDescription>Status</CardDescription>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Badge
                      variant={
                        state?.status === 'completed'
                          ? 'success'
                          : state?.status === 'failed'
                            ? 'destructive'
                            : 'secondary'
                      }
                      className="text-xs"
                    >
                      {state?.status || 'pending'}
                    </Badge>
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      {lastUpdated || 'Not updated'}
                    </span>
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="shadow-sm">
                <CardHeader>
                  <CardDescription>Idea</CardDescription>
                  <CardTitle className="text-lg line-clamp-2">
                    {state?.idea_title || 'Untitled idea'}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="shadow-sm">
                <CardHeader>
                  <CardDescription>Debate ID</CardDescription>
                  <CardTitle className="text-sm font-mono text-slate-600 dark:text-slate-300">
                    {id || '—'}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
          </div>

          {loading && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                <div className="space-y-3 mt-6">
                  <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              </div>
            </div>
          )}

          {!user && !authLoading && (
            <div className="rounded-xl border border-yellow-200 dark:border-yellow-900/50 bg-yellow-50 dark:bg-yellow-900/20 p-6 text-yellow-800 dark:text-yellow-300">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🔒</span>
                <div>
                  <p className="font-semibold">Sign in required</p>
                  <p className="text-sm mt-1">Please sign in to view this debate.</p>
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-6 text-red-700 dark:text-red-300">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-semibold">Error Loading Debate</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {!id && (
            <div className="rounded-xl border border-yellow-200 dark:border-yellow-900/50 bg-yellow-50 dark:bg-yellow-900/20 p-6 text-yellow-800 dark:text-yellow-300">
              <div className="flex items-start gap-3">
                <span className="text-2xl">ℹ️</span>
                <div>
                  <p className="font-semibold">No Debate ID</p>
                  <p className="text-sm mt-1">
                    No debate ID was provided. Please submit an idea first.
                  </p>
                </div>
              </div>
            </div>
          )}

          {state && (
            <Card className="border-slate-200 dark:border-slate-700 shadow-xl bg-white dark:bg-slate-800">
              <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <span className="text-2xl">📝</span> Debate Transcript
                  </CardTitle>
                  <Badge
                    variant={
                      state.status === 'completed'
                        ? 'success'
                        : state.status === 'failed'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {state.status.charAt(0).toUpperCase() + state.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Status explanation */}
                <div className="text-sm text-gray-600 dark:text-gray-300 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
                  {state.status === 'pending' && (
                    <span className="flex items-start gap-2">
                      <span className="text-base mt-0.5">⏳</span>
                      <span>Session created. Processing will begin shortly.</span>
                    </span>
                  )}
                  {state.status === 'in_progress' && (
                    <span className="flex items-start gap-2">
                      <span className="text-base mt-0.5 animate-pulse">🔄</span>
                      <span>Debate in progress. Agents are analyzing your idea.</span>
                    </span>
                  )}
                  {state.status === 'completed' && (
                    <span className="flex items-start gap-2">
                      <span className="text-base mt-0.5">✅</span>
                      <span>Debate completed. Review the transcript and verdict below.</span>
                    </span>
                  )}
                  {state.status === 'failed' && (
                    <span className="flex items-start gap-2">
                      <span className="text-base mt-0.5">❌</span>
                      <span>Debate failed. Check error details below.</span>
                    </span>
                  )}
                </div>

                {state.error && (
                  <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
                    <p className="font-semibold mb-1">Error Details:</p>
                    <p className="font-mono text-xs">{state.error}</p>
                  </div>
                )}

                {/* Transcript */}
                <div>
                  <h3 className="font-bold text-lg mb-6 text-gray-900 dark:text-white">
                    Debate Timeline
                  </h3>
                  <div className="space-y-4">
                    {state.transcript?.length ? (
                      state.transcript.map((item: any, i: number) => {
                        const agent = item?.agent || 'Agent'
                        const message = item?.message || item?.text || ''
                        const timestamp = item?.timestamp
                          ? new Date(item.timestamp).toLocaleTimeString()
                          : ''
                        const round = item?.round || null
                        const type = item?.type || ''

                        // Color coding for agents - using darker backgrounds for light mode, lighter for dark mode
                        let agentColor =
                          'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600'
                        let agentBadge = ''
                        if (agent === 'Judge') {
                          agentColor =
                            'bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-700'
                          agentBadge = '⚖️'
                        } else if (agent === 'Skeptic') {
                          agentColor =
                            'bg-red-50 dark:bg-red-900/30 text-red-900 dark:text-red-100 border border-red-200 dark:border-red-700'
                          agentBadge = '🤨'
                        } else if (agent === 'Customer') {
                          agentColor =
                            'bg-green-50 dark:bg-green-900/30 text-green-900 dark:text-green-100 border border-green-200 dark:border-green-700'
                          agentBadge = '👥'
                        } else if (agent === 'Market') {
                          agentColor =
                            'bg-purple-50 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100 border border-purple-200 dark:border-purple-700'
                          agentBadge = '📊'
                        } else if (agent === 'Builder') {
                          agentColor =
                            'bg-orange-50 dark:bg-orange-900/30 text-orange-900 dark:text-orange-100 border border-orange-200 dark:border-orange-700'
                          agentBadge = '🔨'
                        } else if (agent === 'System') {
                          agentColor =
                            'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                          agentBadge = '⚙️'
                        }

                        return (
                          <div
                            key={i}
                            className={`rounded-lg p-4 ${agentColor} transition-all hover:shadow-md`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{agentBadge}</span>
                                <span className="font-bold text-sm">{agent}</span>
                                {round && agent !== 'System' && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs bg-white/50 dark:bg-slate-800/50"
                                  >
                                    Round {round}
                                  </Badge>
                                )}
                                {/* Removed loading spinner on agent start to avoid lingering icons */}
                              </div>
                              <span className="text-xs opacity-60">{timestamp}</span>
                            </div>
                            <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert">
                              {/* Render markdown-style formatting */}
                              {message.split('\n').map((line: string, lineIdx: number) => {
                                // Bold headings
                                if (line.startsWith('**') && line.endsWith('**')) {
                                  return (
                                    <div key={lineIdx} className="font-bold mt-3 mb-1">
                                      {line.slice(2, -2)}
                                    </div>
                                  )
                                }
                                // Bullet points
                                if (line.trim().startsWith('•')) {
                                  return (
                                    <div key={lineIdx} className="ml-4 my-1">
                                      {line}
                                    </div>
                                  )
                                }
                                // Regular text
                                if (line.trim()) {
                                  return (
                                    <div key={lineIdx} className="my-1">
                                      {line}
                                    </div>
                                  )
                                }
                                return <div key={lineIdx} className="h-1" />
                              })}
                            </div>

                            {/* Metadata badges */}
                            {item?.metadata && Object.keys(item.metadata).length > 0 && (
                              <div className="mt-4 pt-3 border-t border-current opacity-20 flex flex-wrap gap-2">
                                {Object.entries(item.metadata).map(
                                  ([key, value]: [string, any]) => {
                                    // Skip displaying the agent key as we already show it
                                    if (key === 'agent') return null

                                    // Format key for display (convert snake_case to Title Case)
                                    const displayKey = key
                                      .split('_')
                                      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                                      .join(' ')

                                    return (
                                      <Badge
                                        key={key}
                                        variant="outline"
                                        className="text-xs whitespace-nowrap bg-white/30 dark:bg-slate-800/30"
                                      >
                                        {displayKey}: {String(value)}
                                      </Badge>
                                    )
                                  }
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <div className="rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 p-8 text-center">
                        <span className="text-4xl mb-2">🤔</span>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No transcript yet. Agents are analyzing your idea...
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Raw state for debugging/visibility */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                  <button
                    onClick={() => setShowRawState(!showRawState)}
                    className="text-sm font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-2 mb-4"
                  >
                    <span className="text-lg">{showRawState ? '▼' : '▶'}</span> Debug: Raw State
                  </button>
                  {showRawState && (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4 overflow-auto max-h-96">
                      <pre className="text-xs font-mono text-slate-700 dark:text-slate-300">
                        {JSON.stringify(state, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </Container>
      </Section>
    </AppShell>
  )
}
