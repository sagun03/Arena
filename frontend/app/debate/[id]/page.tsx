'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
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
  current_round?: number
  last_updated?: string | null
  error?: string | null
  idea_title?: string
}

const roundLabels: Record<number, string> = {
  1: 'Clarification',
  2: 'Attacks & Analyses',
  3: 'Defense',
  4: 'Cross-Examination',
  5: 'Final Verdict',
}

const agentAlignments: Record<string, 'left' | 'right' | 'center'> = {
  Skeptic: 'left',
  Customer: 'right',
  Market: 'left',
  Builder: 'right',
  Judge: 'left',
}

function formatTimestamp(value?: string | null) {
  if (!value) return ''
  const hasTz = /([zZ]|[+-]\d{2}:\d{2})$/.test(value)
  const normalized = hasTz ? value : `${value}Z`
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleTimeString()
}

export default function DebatePage() {
  const params = useParams<{ id: string }>()
  const id = (params?.id as string) || ''
  const showDebug = process.env.NEXT_PUBLIC_SHOW_DEBUG === 'true'
  const [state, setState] = useState<DebateState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [polling, setPolling] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [showRawState, setShowRawState] = useState(false)
  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({})
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
        setLastUpdated(formatTimestamp(data?.last_updated))
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

  const groupedTranscript = useMemo(
    () =>
      (state?.transcript || []).reduce((acc: Record<string, any[]>, item: any) => {
        const roundKey = String(item?.round || 0)
        if (!acc[roundKey]) acc[roundKey] = []
        acc[roundKey].push(item)
        return acc
      }, {}),
    [state?.transcript]
  )

  const orderedRounds = useMemo(
    () =>
      Object.keys(groupedTranscript)
        .map(key => Number(key))
        .filter(round => round > 0)
        .sort((a, b) => a - b),
    [groupedTranscript]
  )

  const normalizeMarkdown = (text: string) =>
    text
      .split('\n')
      .map(line => {
        const trimmed = line.trim()
        if (!trimmed) return ''
        if (trimmed.startsWith('•')) {
          return `- ${trimmed.replace(/^•\s*/, '')}`
        }
        if (trimmed.endsWith(':') && !trimmed.startsWith('-')) {
          return `#### ${trimmed.slice(0, -1)}`
        }
        return trimmed
      })
      .join('\n')

  const shouldTruncate = (text: string, previewLimit: number) => {
    const normalized = normalizeMarkdown(text)
    const lines = normalized.split('\n').filter(line => line.trim().length > 0)
    const bulletLines = lines.filter(line => line.trim().startsWith('- '))
    return bulletLines.length > previewLimit || lines.length > previewLimit
  }

  const renderMessage = (text: string, previewLimit: number, expanded: boolean) => {
    const normalized = normalizeMarkdown(text)

    const lines = normalized.split('\n').filter(line => line.trim().length > 0)
    const bulletLines = lines.filter(line => line.trim().startsWith('- '))
    const usePreview =
      !expanded && (bulletLines.length > previewLimit || lines.length > previewLimit)

    const previewLines = () => {
      if (bulletLines.length > 0) {
        const headings = lines.filter(line => line.trim().startsWith('#### '))
        return [...headings, ...bulletLines.slice(0, previewLimit)].join('\n')
      }
      return lines.slice(0, previewLimit).join('\n')
    }

    return (
      <ReactMarkdown
        components={{
          h4: ({ children }) => (
            <div className="font-semibold mt-3 mb-1 text-sm uppercase tracking-[0.12em] text-slate-500">
              {children}
            </div>
          ),
          ul: ({ children }) => <ul className="ml-5 list-disc space-y-1">{children}</ul>,
          li: ({ children }) => <li>{children}</li>,
          p: ({ children }) => <p className="my-1">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        }}
      >
        {usePreview ? previewLines() : normalized}
      </ReactMarkdown>
    )
  }

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
                  onClick={() => fetchState()}
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
                  <CardDescription>Round</CardDescription>
                  <CardTitle className="text-lg">
                    {state?.current_round ? `${state.current_round}/5` : '—'}
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
                  <div className="space-y-8">
                    {state.transcript?.length ? (
                      orderedRounds.map(round => {
                        const roundItems = groupedTranscript[String(round)] || []
                        return (
                          <div key={round} className="space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white flex items-center justify-center font-bold">
                                {String(round).padStart(2, '0')}
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                                  Round {round}
                                </p>
                                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                                  {roundLabels[round] || 'Debate'}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-4">
                              {roundItems.map((item: any, i: number) => {
                                const agent = item?.agent || 'Agent'
                                const message = item?.message || item?.text || ''
                                const timestamp = formatTimestamp(item?.timestamp)
                                const messageKey = item?.timestamp
                                  ? `${item.timestamp}-${agent}-${item?.type || 'msg'}`
                                  : `${round}-${i}-${agent}`
                                const align = agentAlignments[agent] || 'left'
                                const bubbleAlign =
                                  align === 'right'
                                    ? 'justify-end'
                                    : align === 'center'
                                      ? 'justify-center'
                                      : 'justify-start'
                                const roleLabel =
                                  item?.type === 'attack'
                                    ? 'Attack'
                                    : item?.type === 'defense'
                                      ? 'Defense'
                                      : item?.type === 'cross_exam'
                                        ? 'Cross-Exam'
                                        : item?.type === 'customer'
                                          ? 'Customer'
                                          : item?.type === 'market'
                                            ? 'Market'
                                            : item?.type === 'clarification:output'
                                              ? 'Clarification'
                                              : item?.type === 'verdict'
                                                ? 'Verdict'
                                                : ''

                                if (round === 1 || round === 5) {
                                  return (
                                    <div
                                      key={`${round}-${i}`}
                                      className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm"
                                    >
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xl">
                                            {round === 1 ? '🧭' : '🏁'}
                                          </span>
                                          <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                            {round === 1 ? 'Round 1 Summary' : 'Final Verdict'}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span className="text-xs text-slate-500">
                                            {timestamp}
                                          </span>
                                          {round === 5 && item?.type === 'verdict' && (
                                            <Button
                                              size="sm"
                                              className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white"
                                              onClick={() =>
                                                window.location.assign(`/verdict/${id}`)
                                              }
                                            >
                                              View verdict
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert">
                                        {renderMessage(message, 5, expandedMessages[messageKey])}
                                      </div>
                                      {message && shouldTruncate(message, 5) && (
                                        <div className="mt-3">
                                          <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() =>
                                              setExpandedMessages(prev => ({
                                                ...prev,
                                                [messageKey]: !prev[messageKey],
                                              }))
                                            }
                                          >
                                            {expandedMessages[messageKey]
                                              ? 'Show less'
                                              : 'Show more'}
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  )
                                }

                                let agentColor =
                                  'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600'
                                let agentBadge = ''
                                if (agent === 'Judge') {
                                  agentColor =
                                    'bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-700'
                                  agentBadge = '⚖️'
                                } else if (agent === 'Skeptic') {
                                  agentColor =
                                    'bg-rose-50 dark:bg-rose-900/30 text-rose-900 dark:text-rose-100 border border-rose-200 dark:border-rose-700'
                                  agentBadge = '🤨'
                                } else if (agent === 'Customer') {
                                  agentColor =
                                    'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-100 border border-emerald-200 dark:border-emerald-700'
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

                                const tailPosition =
                                  align === 'right'
                                    ? 'right-4 -bottom-2'
                                    : align === 'center'
                                      ? 'left-1/2 -translate-x-1/2 -bottom-2'
                                      : 'left-4 -bottom-2'

                                return (
                                  <div key={`${round}-${i}`} className={`flex ${bubbleAlign}`}>
                                    <div className="flex items-start gap-3 max-w-3xl">
                                      <div className="h-10 w-10 rounded-full bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-base">
                                        {agentBadge || '💬'}
                                      </div>
                                      <div
                                        className={`relative max-w-xl rounded-2xl p-4 ${agentColor} transition-all hover:shadow-md text-left`}
                                      >
                                        <span
                                          className={`absolute h-3 w-3 rotate-45 ${agentColor} ${tailPosition}`}
                                        />
                                        <div className="flex items-center justify-between mb-3 gap-4">
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-sm">{agent}</span>
                                            {roleLabel && (
                                              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                                                {roleLabel}
                                              </span>
                                            )}
                                          </div>
                                          <span className="text-xs opacity-60">{timestamp}</span>
                                        </div>
                                        <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert">
                                          {renderMessage(message, 5, expandedMessages[messageKey])}
                                        </div>
                                        {message && shouldTruncate(message, 5) && (
                                          <div className="mt-3">
                                            <Button
                                              size="sm"
                                              variant="secondary"
                                              onClick={() =>
                                                setExpandedMessages(prev => ({
                                                  ...prev,
                                                  [messageKey]: !prev[messageKey],
                                                }))
                                              }
                                            >
                                              {expandedMessages[messageKey]
                                                ? 'Show less'
                                                : 'Show more'}
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
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
                {showDebug && (
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
                )}
              </CardContent>
            </Card>
          )}
        </Container>
      </Section>
    </AppShell>
  )
}
