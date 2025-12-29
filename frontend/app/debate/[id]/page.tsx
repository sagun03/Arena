'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Section, Container } from '@/components/section'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/card'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'

type DebateState = {
  debate_id: string
  status: string
  transcript: Array<any>
  error?: string | null
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

  async function fetchState() {
    try {
      setLoading(true)
      setError(null)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
      const res = await fetch(`${apiUrl}/arena/debate/${id}`)
      if (!res.ok) throw new Error(`Failed: ${res.status}`)
      const data = await res.json()
      setState(data)
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch debate state')
    } finally {
      setLoading(false)
      setLastUpdated(new Date().toLocaleTimeString())
    }
  }

  useEffect(() => {
    if (!id) return
    fetchState()
    const interval = setInterval(() => {
      if (polling) fetchState()
    }, 5000)
    return () => clearInterval(interval)
  }, [id, polling])

  useEffect(() => {
    if (state?.status === 'completed') {
      setPolling(false)
    }
  }, [state])

  return (
    <Section className="py-8 sm:py-12 md:py-16 bg-gradient-to-b from-white to-slate-50 dark:from-gray-900 dark:to-slate-900">
      <Container size="lg">
        {/* Page Header */}
        <div className="mb-12 text-center relative">
          {/* Decorative blur effect */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-r from-purple-300/20 to-pink-300/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative">
            <Badge
              variant="secondary"
              className="mb-6 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 px-4 py-2 shadow-sm"
            >
              <span className="text-lg">💬</span> Debate Transcript
            </Badge>
            <h1 className="text-5xl sm:text-6xl font-black mb-3">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 dark:from-purple-400 dark:via-pink-400 dark:to-blue-400">
                Live Analysis
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-6 font-medium">
              Watch agents challenge your idea in real-time
            </p>

            <div className="inline-flex items-center gap-3 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-full px-6 py-3 shadow-lg border border-slate-200/50 dark:border-slate-700/50 mb-6">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                {id || '—'}
              </span>
              <span className="text-gray-300 dark:text-gray-600">•</span>
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
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {lastUpdated || 'Not updated'}
              </span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={fetchState}
                className="shadow-md hover:shadow-xl transition-all"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </Button>
              <Button
                onClick={() => setPolling(p => !p)}
                variant={polling ? 'primary' : 'secondary'}
                size="sm"
                className="shadow-md hover:shadow-xl transition-all"
              >
                {polling ? (
                  <>
                    <svg
                      className="w-4 h-4 mr-2 animate-pulse"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Auto-refresh: On
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                    Auto-refresh: Off
                  </>
                )}
              </Button>
              <a href={`/verdict/${id}`}>
                <Button
                  size="sm"
                  className="shadow-md hover:shadow-xl transition-all bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  View Verdict
                </Button>
              </a>
            </div>
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
                              {type?.includes(':start') && agent !== 'System' && (
                                <span className="inline-block animate-spin ml-2">⟳</span>
                              )}
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
                              {Object.entries(item.metadata).map(([key, value]: [string, any]) => {
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
                              })}
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
  )
}
