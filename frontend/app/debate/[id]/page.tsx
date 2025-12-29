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
    <Section className="py-16">
      <Container size="lg">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Debate Status</h1>
          <p className="text-sm text-gray-500">
            ID: <span className="font-mono break-all">{id || '—'}</span>
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
            <span>Last updated: {lastUpdated || '—'}</span>
            <span>•</span>
            <span>{polling ? 'Auto-refresh: on (5s)' : 'Auto-refresh: off'}</span>
            {id && (
              <button
                className="ml-2 rounded border border-gray-200 px-2 py-1 hover:bg-gray-50"
                onClick={() => navigator.clipboard.writeText(id)}
              >
                Copy ID
              </button>
            )}
          </div>
        </div>

        {loading && (
          <div className="rounded-xl border border-gray-200 p-4">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-24 bg-gray-200 rounded" />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        )}
        {!id && (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
            No debate ID provided.
          </div>
        )}

        {state && (
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Current Status</CardTitle>
              <Badge
                variant={
                  state.status === 'completed'
                    ? 'success'
                    : state.status === 'failed'
                      ? 'destructive'
                      : 'secondary'
                }
              >
                {state.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status explanation */}
              <div className="text-sm text-gray-600">
                {state.status === 'pending' && (
                  <span>Session created. Processing will begin shortly.</span>
                )}
                {state.status === 'in_progress' && (
                  <span>Debate running. Agents are generating outputs.</span>
                )}
                {state.status === 'completed' && (
                  <span>Debate completed. View the final verdict.</span>
                )}
                {state.status === 'failed' && <span>Debate failed. See error details below.</span>}
              </div>

              {state.error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  Error: {state.error}
                </div>
              )}
              <div className="flex gap-3">
                <Button variant="secondary" onClick={fetchState}>
                  Refresh
                </Button>
                <Button onClick={() => setPolling(p => !p)}>
                  {polling ? 'Stop Auto-Refresh' : 'Start Auto-Refresh'}
                </Button>
                <a href={`/verdict/${id}`}>
                  <Button>View Verdict</Button>
                </a>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Debate Transcript</h3>
                <div className="space-y-3">
                  {state.transcript?.length ? (
                    state.transcript.map((item: any, i: number) => {
                      const agent = item?.agent || 'Agent'
                      const message = item?.message || item?.text || ''
                      const timestamp = item?.timestamp
                        ? new Date(item.timestamp).toLocaleTimeString()
                        : ''
                      const round = item?.round || null
                      const type = item?.type || ''

                      // Color coding for agents
                      let agentColor = 'bg-gray-100 text-gray-900'
                      if (agent === 'Judge') agentColor = 'bg-blue-100 text-blue-900'
                      else if (agent === 'Skeptic') agentColor = 'bg-red-100 text-red-900'
                      else if (agent === 'Customer') agentColor = 'bg-green-100 text-green-900'
                      else if (agent === 'Market') agentColor = 'bg-purple-100 text-purple-900'
                      else if (agent === 'Builder') agentColor = 'bg-orange-100 text-orange-900'
                      else if (agent === 'System') agentColor = 'bg-gray-200 text-gray-800'

                      return (
                        <div key={i} className={`rounded-lg border p-4 ${agentColor}`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{agent}</span>
                              {round && (
                                <Badge variant="secondary" className="text-xs">
                                  R{round}
                                </Badge>
                              )}
                              {type &&
                                type !== 'clarification:output' &&
                                type !== 'attack' &&
                                type !== 'defense' && (
                                  <span className="text-xs opacity-70">{type}</span>
                                )}
                              {type?.endsWith(':start') && (
                                <span className="inline-block animate-spin">⟳</span>
                              )}
                            </div>
                            <span className="text-xs opacity-60">{timestamp}</span>
                          </div>
                          <div className="text-sm whitespace-pre-wrap prose prose-sm max-w-none">
                            {/* Render markdown-style formatting */}
                            {message.split('\n').map((line: string, lineIdx: number) => {
                              // Bold headings
                              if (line.startsWith('**') && line.endsWith('**')) {
                                return (
                                  <div key={lineIdx} className="font-bold mt-2 mb-1">
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
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      No transcript yet. Agents are thinking...
                    </p>
                  )}
                </div>
              </div>

              {/* Raw state for debugging/visibility */}
              <div>
                <button
                  onClick={() => setShowRawState(!showRawState)}
                  className="text-sm font-semibold text-blue-600 hover:underline mb-2"
                >
                  {showRawState ? '▼' : '▶'} Raw State (Debug)
                </button>
                {showRawState && (
                  <pre className="rounded-lg border border-gray-200 bg-gray-50 p-3 overflow-auto text-xs max-h-96">
                    {JSON.stringify(state, null, 2)}
                  </pre>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </Container>
    </Section>
  )
}
