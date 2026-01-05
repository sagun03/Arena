'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Section, Container } from '@/components/section'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { AppShell } from '@/components/app-shell'
import {
  getDebateState,
  getDebateVerdict,
  getExecutionPlan,
  getInterviewPersonas,
  getVerdictById,
  rebuttalInterview,
  runInterview,
  saveVerdict,
  updateExecutionTask,
} from '@/lib/arena-service'
import { useAuth } from '../../providers/auth-provider'

type VerdictResponse = {
  debate_id: string
  verdict: Verdict | null
  status: string
  message: string
  idea_title?: string | null
  started_at?: string | null
  last_updated?: string | null
}

type Scorecard = Record<string, number | undefined>

type KillShot = {
  title: string
  description: string
  severity?: string
  agent?: string
}

type TestPlanItem = {
  day: number | string
  task: string
  success_criteria: string
}

type InvestorReadiness = {
  score: number
  verdict: string
  reasons?: string[]
}

type Verdict = {
  decision: string
  scorecard?: Scorecard
  kill_shots?: KillShot[]
  assumptions?: string[]
  test_plan?: TestPlanItem[]
  risk_checklist?: Array<{
    title?: string
    rationale?: string
    priority?: string
    owner?: string
  }>
  sprint_plan?: TestPlanItem[]
  pivot_ideas?: string[]
  investor_readiness?: InvestorReadiness
  reasoning?: string
  confidence?: number
}

type ExecutionTask = {
  id: string
  title?: string
  rationale?: string
  priority?: string
  owner?: string
  day?: number
  task?: string
  success_criteria?: string
  completed: boolean
}

type ExecutionPlan = {
  debate_id: string
  checklist: ExecutionTask[]
  sprint_plan: ExecutionTask[]
}

type InterviewPersona = {
  id: string
  name: string
  headline?: string
  traits?: string[]
  priorities?: string[]
}

type InterviewResponse = {
  summary?: string
  reactions?: string[]
  concerns?: string[]
  willingness_to_pay?: {
    will_pay?: boolean
    price_range?: string
    reason?: string
  }
  adoption_barriers?: string[]
  verdict?: string
  reply?: string
  bullets?: string[]
  final_stance?: string
  follow_up_questions?: string[]
}

type ChatEntry = {
  role: 'founder' | 'persona'
  message: string
}

const decisionStyles: Record<string, { label: string; badge: string; accent: string }> = {
  proceed: { label: 'Proceed', badge: 'success', accent: 'text-emerald-600' },
  pivot: { label: 'Pivot', badge: 'warning', accent: 'text-amber-600' },
  kill: { label: 'Kill', badge: 'destructive', accent: 'text-rose-600' },
  'needs work': { label: 'Needs Work', badge: 'secondary', accent: 'text-slate-600' },
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase()
}

function isMissingTitle(value?: string | null) {
  return !value || value.trim().length === 0 || value.trim().toLowerCase() === 'untitled idea'
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength).trim()}…`
}

function limitList(items?: string[], limit = 5) {
  if (!items?.length) return []
  return items.slice(0, limit)
}

function formatTimestamp(value?: string | null) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleTimeString()
}

function formatKeyLabel(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, match => match.toUpperCase())
}

function scoreColor(score: number) {
  if (score >= 70) return 'bg-emerald-500'
  if (score >= 50) return 'bg-amber-500'
  return 'bg-rose-500'
}

function severityBadge(severity?: string) {
  const key = normalizeKey(severity || 'medium')
  if (key === 'critical') return 'destructive'
  if (key === 'high') return 'warning'
  if (key === 'medium') return 'secondary'
  return 'secondary'
}

export default function VerdictPage() {
  const params = useParams<{ id: string }>()
  const id = (params?.id as string) || ''
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = useState<VerdictResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [ideaTitle, setIdeaTitle] = useState<string | null>(null)
  const [verdictSaved, setVerdictSaved] = useState(false)
  const [executionPlan, setExecutionPlan] = useState<ExecutionPlan | null>(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)
  const [planUpdatingId, setPlanUpdatingId] = useState<string | null>(null)
  const [personas, setPersonas] = useState<InterviewPersona[]>([])
  const [interviewResponses, setInterviewResponses] = useState<Record<string, InterviewResponse>>(
    {}
  )
  const [chatHistory, setChatHistory] = useState<Record<string, ChatEntry[]>>({})
  const [interviewLoadingId, setInterviewLoadingId] = useState<string | null>(null)
  const [interviewError, setInterviewError] = useState<string | null>(null)
  const [activePersonaId, setActivePersonaId] = useState<string | null>(null)
  const [rebuttalMessage, setRebuttalMessage] = useState('')

  async function fetchVerdict() {
    try {
      setLoading(true)
      setError(null)
      if (!user) {
        setError('Please sign in to view this verdict')
        setLoading(false)
        return
      }

      const json = await getDebateVerdict(id)
      setData(json)
      if (json?.idea_title && !isMissingTitle(json.idea_title)) {
        setIdeaTitle(json.idea_title)
      }
      setLastUpdated(formatTimestamp(json?.last_updated || json?.started_at))
      try {
        const stateJson = await getDebateState(id)
        const stateTitle = stateJson?.idea_title ?? null
        if (stateTitle && !isMissingTitle(stateTitle)) {
          setIdeaTitle(stateTitle)
        } else {
          const verdictRecord = await getVerdictById(id)
          setIdeaTitle(verdictRecord?.ideaTitle ?? null)
        }
      } catch {}
    } catch (err: any) {
      const message = err?.response?.data?.detail || err?.message || 'Failed to fetch verdict'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  async function loadExecutionPlan() {
    if (!id || !user) return
    try {
      setPlanLoading(true)
      setPlanError(null)
      const plan = await getExecutionPlan(id)
      setExecutionPlan(plan)
    } catch (err: any) {
      const message = err?.response?.data?.detail || err?.message || 'Failed to load execution plan'
      setPlanError(message)
    } finally {
      setPlanLoading(false)
    }
  }

  async function loadPersonas() {
    if (!user) return
    try {
      const list = await getInterviewPersonas()
      setPersonas(list)
    } catch (err: any) {
      setInterviewError(
        err?.response?.data?.detail || err?.message || 'Failed to load interview panel'
      )
    }
  }

  async function handleRunInterview(personaId: string) {
    if (!id || !user) return
    try {
      setInterviewError(null)
      setInterviewLoadingId(personaId)
      setActivePersonaId(personaId)
      const result = await runInterview(id, personaId)
      setInterviewResponses(prev => ({
        ...prev,
        [personaId]: result.response || {},
      }))
    } catch (err: any) {
      setInterviewError(
        err?.response?.data?.detail || err?.message || 'Interview failed. Try again.'
      )
    } finally {
      setInterviewLoadingId(null)
    }
  }

  async function handleRebuttalSubmit(personaId: string) {
    if (!id || !user || !rebuttalMessage.trim()) return
    const message = rebuttalMessage.trim()
    const history = chatHistory[personaId] ?? []
    try {
      setInterviewError(null)
      setInterviewLoadingId(personaId)
      const result = await rebuttalInterview(id, personaId, message, history)
      setChatHistory(prev => ({
        ...prev,
        [personaId]: [
          ...(prev[personaId] ?? []),
          { role: 'founder', message },
          { role: 'persona', message: result.response?.reply || 'No reply provided.' },
        ],
      }))
      setInterviewResponses(prev => ({
        ...prev,
        [personaId]: {
          ...(prev[personaId] ?? {}),
          ...result.response,
        },
      }))
      setRebuttalMessage('')
    } catch (err: any) {
      setInterviewError(
        err?.response?.data?.detail || err?.message || 'Rebuttal failed. Try again.'
      )
    } finally {
      setInterviewLoadingId(null)
    }
  }

  async function handleToggleTask(task: ExecutionTask, listType: 'checklist' | 'sprint') {
    if (!id || !user) return
    try {
      setPlanUpdatingId(task.id)
      const updated = await updateExecutionTask(id, task.id, listType, !task.completed)
      setExecutionPlan(updated)
    } catch (err: any) {
      setPlanError(err?.response?.data?.detail || err?.message || 'Failed to update execution task')
    } finally {
      setPlanUpdatingId(null)
    }
  }

  useEffect(() => {
    if (!id || !user || authLoading) return
    fetchVerdict()
  }, [id, user, authLoading])

  useEffect(() => {
    if (!id || !user || authLoading) return
    loadPersonas()
  }, [id, user, authLoading])

  // Save verdict to Firestore when completed
  useEffect(() => {
    if (data?.status === 'completed' && data?.verdict && !verdictSaved && id && user) {
      saveVerdict(id, data.verdict, data.status, ideaTitle).catch(err => {
        console.error('Failed to persist verdict via API service:', err)
      })
      setVerdictSaved(true)
    }
  }, [data?.status, data?.verdict, verdictSaved, id, ideaTitle, user])

  useEffect(() => {
    if (!id || !user || authLoading) return
    if (data?.status === 'completed') {
      loadExecutionPlan()
    }
  }, [data?.status, id, user, authLoading])

  const statusBadgeVariant =
    data?.status === 'completed'
      ? 'success'
      : data?.status === 'failed'
        ? 'destructive'
        : 'secondary'

  const verdict = data?.verdict
  const normalizedDecision = normalizeKey(verdict?.decision || '')
  const decisionStyle = decisionStyles[normalizedDecision] || {
    label: verdict?.decision || 'Unknown',
    badge: 'secondary',
    accent: 'text-slate-600',
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
                  Final verdict
                </Badge>
                <div>
                  <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
                    Idea validation
                  </h1>
                  <p className="text-lg text-slate-600 dark:text-slate-300">
                    Comprehensive analysis and recommendations.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={fetchVerdict}
                  className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white"
                >
                  Refresh
                </Button>
                <a href={`/debate/${id}`}>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)]"
                  >
                    View transcript
                  </Button>
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardDescription>Status</CardDescription>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Badge variant={statusBadgeVariant as any} className="text-xs">
                      {data?.status || 'pending'}
                    </Badge>
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      {lastUpdated || 'Not updated'}
                    </span>
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="shadow-sm">
                <CardHeader>
                  <CardDescription>Decision</CardDescription>
                  <CardTitle className={`text-lg ${decisionStyle.accent}`}>
                    {decisionStyle.label}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="shadow-sm">
                <CardHeader>
                  <CardDescription>Idea</CardDescription>
                  <CardTitle className="text-lg line-clamp-2">
                    {ideaTitle || 'Untitled idea'}
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
            <div className="rounded-2xl border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-900/20 p-12 text-center shadow-xl">
              <div className="relative w-16 h-16 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-purple-200 dark:border-purple-900"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-600 dark:border-t-purple-400 animate-spin"></div>
              </div>
              <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Analyzing Verdict
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Processing your idea validation...
              </p>
            </div>
          )}
          {error && (
            <div className="rounded-xl border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-red-700 dark:text-red-300 text-center">
              <svg
                className="w-12 h-12 mx-auto mb-3 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {error}
            </div>
          )}
          {!id && (
            <div className="rounded-xl border-2 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-6 text-yellow-800 dark:text-yellow-300 text-center">
              <svg
                className="w-12 h-12 mx-auto mb-3 text-yellow-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              No debate ID provided.
            </div>
          )}

          {data && (
            <div className="space-y-6">
              {verdict ? (
                <Card className="shadow-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                  {/* Report Header */}
                  <div className="border-b-2 border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-purple-50/50 via-pink-50/50 to-blue-50/50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-blue-900/20 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-3xl font-black text-gray-900 dark:text-white">
                          Verdict:{' '}
                          <span className={decisionStyle.accent}>{decisionStyle.label}</span>
                        </h3>
                      </div>
                      <div className="flex items-center gap-3 mb-2">
                        <Badge
                          variant="warning"
                          className="text-base px-4 py-1.5 bg-yellow-100 text-yellow-800 border-yellow-200 shadow-sm"
                        >
                          Overall Score: {verdict.scorecard?.overall_score || 0}/100
                        </Badge>
                        {typeof verdict.confidence === 'number' && (
                          <Badge variant="secondary" className="text-xs">
                            {(verdict.confidence * 100).toFixed(0)}% Confidence
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        Debate ID: {id}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          const blob = new Blob([JSON.stringify(data, null, 2)], {
                            type: 'application/json',
                          })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `ideaaudit-verdict-${id}.json`
                          document.body.appendChild(a)
                          a.click()
                          document.body.removeChild(a)
                          URL.revokeObjectURL(url)
                        }}
                        className="flex items-center gap-2 bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)]"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        Download Report
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(data, null, 2))
                        }}
                        className="flex items-center gap-2"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                          />
                        </svg>
                        Copy JSON
                      </Button>
                    </div>
                  </div>

                  <CardContent className="p-6 space-y-8">
                    {/* Scorecard Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {Object.entries(verdict.scorecard || {}).map(([key, score]) => {
                        const scoreValue = typeof score === 'number' ? score : 0
                        const getScoreStatus = (val: number) => {
                          if (val >= 70)
                            return {
                              label: 'Strong',
                              color: 'from-emerald-500 to-teal-600',
                              bg: 'bg-emerald-50 dark:bg-emerald-900/20',
                            }
                          if (val >= 50)
                            return {
                              label: 'Moderate',
                              color: 'from-amber-500 to-orange-600',
                              bg: 'bg-amber-50 dark:bg-amber-900/20',
                            }
                          return {
                            label: 'Weak',
                            color: 'from-red-500 to-rose-600',
                            bg: 'bg-red-50 dark:bg-red-900/20',
                          }
                        }
                        const status = getScoreStatus(scoreValue)
                        return (
                          <div
                            key={key}
                            className={`${key === 'overall_score' ? 'col-span-2 md:col-span-5' : ''} ${status.bg} p-5 rounded-xl border-2 border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-all`}
                          >
                            <div
                              className={`text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider font-bold mb-3 ${key === 'overall_score' ? 'text-center' : ''}`}
                            >
                              {formatKeyLabel(key)}
                            </div>
                            <div
                              className={`flex items-end justify-between ${key === 'overall_score' ? 'flex-col items-center' : ''}`}
                            >
                              <div className="flex items-baseline gap-1">
                                <span
                                  className={`font-black ${key === 'overall_score' ? 'text-5xl' : 'text-3xl'} bg-gradient-to-r ${status.color} text-transparent bg-clip-text`}
                                >
                                  {scoreValue}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400 text-sm">
                                  /100
                                </span>
                              </div>
                              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 px-2 py-1 bg-white/50 dark:bg-gray-800/50 rounded-full">
                                {status.label}
                              </span>
                            </div>
                            <div className="w-full bg-gray-300 dark:bg-gray-700 h-2.5 rounded-full mt-4 overflow-hidden">
                              <div
                                className={`h-2.5 rounded-full bg-gradient-to-r ${status.color} transition-all duration-500`}
                                style={{ width: `${scoreValue}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Reasoning */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 p-5 rounded-xl border-2 border-blue-200 dark:border-blue-800 shadow-sm">
                      <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                        <span className="text-2xl">💡</span> Executive Summary
                      </h4>
                      <div className="text-blue-900 dark:text-blue-200 text-sm leading-relaxed space-y-2">
                        {verdict.reasoning ? (
                          verdict.reasoning.split(/\.\s+/).map((sentence, idx) => {
                            if (!sentence.trim()) return null
                            const fullSentence =
                              sentence.trim() +
                              (idx < verdict.reasoning!.split(/\.\s+/).length - 1 ? '.' : '')
                            const lowerSentence = fullSentence.toLowerCase()

                            // Bold sentences that contain critical terms or conclusions
                            const shouldBold =
                              lowerSentence.includes('fatal') ||
                              lowerSentence.includes('critical') ||
                              lowerSentence.includes('requires a') ||
                              lowerSentence.includes('pivot') ||
                              lowerSentence.includes('kill') ||
                              lowerSentence.includes('contradicts') ||
                              lowerSentence.includes('undermining') ||
                              lowerSentence.includes('absence of')

                            return shouldBold ? (
                              <p key={idx} className="font-bold">
                                {fullSentence}
                              </p>
                            ) : (
                              <p key={idx}>{fullSentence}</p>
                            )
                          })
                        ) : (
                          <p>Reasoning will appear once the verdict is finalized.</p>
                        )}
                      </div>
                      <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800 flex items-center justify-between">
                        <span className="text-xs text-blue-700 dark:text-blue-300">
                          Confidence:{' '}
                          <span className="font-bold">
                            {typeof verdict.confidence === 'number'
                              ? (verdict.confidence * 100).toFixed(0)
                              : 0}
                            %
                          </span>
                        </span>
                        <Badge variant="warning" className="text-xs">
                          {verdict.kill_shots?.length || 0} Critical Issues Found
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 p-5 shadow-sm">
                        <h4 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                          <span className="text-xl">🧭</span> Pivot Generator
                        </h4>
                        <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                          {(verdict.pivot_ideas || []).length ? (
                            verdict.pivot_ideas?.map((pivot, idx) => (
                              <li
                                key={idx}
                                className="rounded-lg border border-slate-200/70 dark:border-slate-700/70 bg-slate-50 dark:bg-slate-800/60 px-3 py-2"
                              >
                                {pivot}
                              </li>
                            ))
                          ) : (
                            <li className="text-slate-500">No pivots generated yet.</li>
                          )}
                        </ul>
                      </div>

                      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/70 dark:bg-emerald-900/20 p-5 shadow-sm">
                        <h4 className="font-bold text-emerald-900 dark:text-emerald-100 mb-3 flex items-center gap-2">
                          <span className="text-xl">💼</span> Investor Readiness
                        </h4>
                        <div className="flex items-center gap-4 mb-3">
                          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-300">
                            {verdict.investor_readiness?.score ?? 0}
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                              {verdict.investor_readiness?.verdict || 'NotReady'}
                            </p>
                            <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
                              Likelihood of a VC meeting today.
                            </p>
                          </div>
                        </div>
                        <ul className="space-y-2 text-sm text-emerald-900 dark:text-emerald-100">
                          {(verdict.investor_readiness?.reasons || []).map((reason, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                              <span>{reason}</span>
                            </li>
                          ))}
                          {!verdict.investor_readiness?.reasons?.length && (
                            <li className="text-emerald-700/70 dark:text-emerald-300/70">
                              No readiness notes available.
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Kill Shots */}
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <span className="text-2xl">🎯</span> Critical Kill-Shots
                          <Badge variant="destructive" className="text-xs">
                            {verdict.kill_shots?.length || 0}
                          </Badge>
                        </h4>
                        <div className="space-y-3 max-h-none sm:max-h-[800px] overflow-y-auto pr-0 sm:pr-2">
                          {(verdict.kill_shots || []).map((shot, i) => {
                            const getSeverityColor = (sev: string) => {
                              const lower = sev?.toLowerCase() || ''
                              if (lower.includes('critical'))
                                return {
                                  bg: 'bg-red-50 dark:bg-red-900/20',
                                  border: 'border-red-200 dark:border-red-800',
                                  text: 'text-red-900 dark:text-red-200',
                                  badge: 'from-red-600 to-rose-700',
                                }
                              if (lower.includes('high'))
                                return {
                                  bg: 'bg-orange-50 dark:bg-orange-900/20',
                                  border: 'border-orange-200 dark:border-orange-800',
                                  text: 'text-orange-900 dark:text-orange-200',
                                  badge: 'from-orange-600 to-red-600',
                                }
                              return {
                                bg: 'bg-yellow-50 dark:bg-yellow-900/20',
                                border: 'border-yellow-200 dark:border-yellow-800',
                                text: 'text-yellow-900 dark:text-yellow-200',
                                badge: 'from-yellow-600 to-orange-600',
                              }
                            }
                            const colors = getSeverityColor(shot.severity || 'medium')
                            return (
                              <div
                                key={i}
                                className={`${colors.bg} p-4 rounded-xl border-2 ${colors.border} hover:shadow-lg transition-all group`}
                              >
                                <div className="flex items-start justify-between gap-2 mb-3">
                                  <div className="flex-1">
                                    <span
                                      className={`font-bold ${colors.text} text-sm leading-tight block`}
                                    >
                                      {shot.title}
                                    </span>
                                  </div>
                                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                                    <div
                                      className={`text-[10px] font-bold text-white px-2.5 py-1 rounded-full bg-gradient-to-r ${colors.badge} shadow-md whitespace-nowrap`}
                                    >
                                      {shot.severity}
                                    </div>
                                    {shot.agent && (
                                      <span
                                        className={`text-[10px] font-semibold opacity-70 group-hover:opacity-100 transition-opacity`}
                                      >
                                        {shot.agent}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <p className={`text-xs leading-relaxed ${colors.text} opacity-90`}>
                                  {shot.description}
                                </p>
                              </div>
                            )
                          })}
                          {!verdict.kill_shots?.length && (
                            <div className="text-center py-8">
                              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                                ✓ No critical issues identified
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Test Plan + Assumptions */}
                      <div className="space-y-6">
                        {/* Test Plan */}
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <span className="text-xl">🧪</span> 7-Day Test Plan
                          </h4>
                          <div className="space-y-2 max-h-none sm:max-h-[500px] overflow-y-auto">
                            {(verdict.test_plan || []).map((plan, i) => (
                              <div
                                key={i}
                                className="bg-blue-50 dark:bg-blue-900/15 rounded-lg p-3 border border-blue-200 dark:border-blue-800/30"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
                                    {i + 1}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                                      Day {plan.day}
                                    </div>
                                    <div className="text-sm text-gray-900 dark:text-gray-200 mt-1">
                                      {plan.task}
                                    </div>
                                    <div className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 rounded mt-2 p-2">
                                      ✓ {plan.success_criteria}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {!verdict.test_plan?.length && (
                              <div className="text-center py-6 text-slate-500">
                                No test plan provided.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Assumptions Preview */}
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                            <span className="text-xl">⚠️</span> Key Assumptions
                            <Badge variant="warning" className="text-xs">
                              {verdict.assumptions?.length || 0}
                            </Badge>
                          </h4>
                          <div className="space-y-2 max-h-none sm:max-h-[340px] overflow-y-auto">
                            {(verdict.assumptions || []).map((assumption, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/15 dark:to-orange-900/10 border-l-4 border-amber-400 dark:border-amber-600 shadow-sm hover:shadow-md transition-shadow group"
                              >
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white text-xs font-bold flex items-center justify-center mt-0.5 shadow-sm">
                                  {i + 1}
                                </div>
                                <p className="text-xs text-amber-900 dark:text-amber-100 leading-relaxed font-medium">
                                  {assumption}
                                </p>
                              </div>
                            ))}
                            {!verdict.assumptions?.length && (
                              <div className="text-sm text-emerald-600 dark:text-emerald-400 text-center py-4 font-medium">
                                ✓ No critical assumptions identified
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 p-6 shadow-sm space-y-6">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="text-2xl">✅</span> Execution Mode
                          </h4>
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            Turn insights into action with a clear checklist and 7-day sprint.
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={loadExecutionPlan}
                          className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white"
                        >
                          Refresh plan
                        </Button>
                      </div>

                      {planLoading && (
                        <div className="text-sm text-slate-500">Loading execution plan...</div>
                      )}
                      {planError && (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                          {planError}
                        </div>
                      )}
                      {!planLoading && !planError && executionPlan && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                              De-Risk Checklist
                            </div>
                            {(executionPlan.checklist || []).map(task => (
                              <label
                                key={task.id}
                                className="flex items-start gap-3 rounded-lg border border-slate-200/70 dark:border-slate-700/70 bg-slate-50 dark:bg-slate-800/60 p-3 hover:shadow-sm transition"
                              >
                                <input
                                  type="checkbox"
                                  checked={task.completed}
                                  onChange={() => handleToggleTask(task, 'checklist')}
                                  disabled={planUpdatingId === task.id}
                                  className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                      {task.title || 'Checklist item'}
                                    </span>
                                    {task.priority && (
                                      <Badge variant="secondary" className="text-[10px]">
                                        {task.priority}
                                      </Badge>
                                    )}
                                    {task.owner && (
                                      <Badge variant="outline" className="text-[10px]">
                                        {task.owner}
                                      </Badge>
                                    )}
                                  </div>
                                  {task.rationale && (
                                    <p className="text-xs text-slate-600 dark:text-slate-300">
                                      {task.rationale}
                                    </p>
                                  )}
                                </div>
                              </label>
                            ))}
                            {!executionPlan.checklist?.length && (
                              <div className="text-sm text-slate-500">Checklist not ready yet.</div>
                            )}
                          </div>

                          <div className="space-y-3">
                            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                              7-Day Sprint Plan
                            </div>
                            {(executionPlan.sprint_plan || []).map(task => (
                              <label
                                key={task.id}
                                className="flex items-start gap-3 rounded-lg border border-slate-200/70 dark:border-slate-700/70 bg-white dark:bg-slate-900/60 p-3 hover:shadow-sm transition"
                              >
                                <input
                                  type="checkbox"
                                  checked={task.completed}
                                  onChange={() => handleToggleTask(task, 'sprint')}
                                  disabled={planUpdatingId === task.id}
                                  className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-semibold text-indigo-600">
                                      Day {task.day ?? '—'}
                                    </span>
                                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                      {task.task || 'Sprint task'}
                                    </span>
                                  </div>
                                  {task.success_criteria && (
                                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                                      ✓ {task.success_criteria}
                                    </p>
                                  )}
                                </div>
                              </label>
                            ))}
                            {!executionPlan.sprint_plan?.length && (
                              <div className="text-sm text-slate-500">Sprint plan not ready.</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/70 p-6 shadow-sm space-y-5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="text-2xl">🎙️</span> Synthetic Interview Panel
                          </h4>
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            Run persona interviews and rebut their concerns in real time.
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {personas.length} personas
                        </Badge>
                      </div>

                      {interviewError && (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                          {interviewError}
                        </div>
                      )}

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {personas.map(persona => {
                          const response = interviewResponses[persona.id]
                          const isActive = activePersonaId === persona.id
                          return (
                            <div
                              key={persona.id}
                              className="rounded-xl border border-slate-200/70 dark:border-slate-700/70 bg-slate-50 dark:bg-slate-800/60 p-4 space-y-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                    {persona.name}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-300">
                                    {persona.headline}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => handleRunInterview(persona.id)}
                                  className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white"
                                >
                                  {interviewLoadingId === persona.id ? 'Running...' : 'Run'}
                                </Button>
                              </div>

                              {response && (
                                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                                  {response.summary && (
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                      {response.summary}
                                    </p>
                                  )}
                                  {!!limitList(response.reactions).length && (
                                    <div>
                                      <p className="font-semibold text-slate-700 dark:text-slate-200">
                                        Reactions
                                      </p>
                                      <ul className="list-disc list-inside space-y-1">
                                        {limitList(response.reactions).map((item, idx) => (
                                          <li key={idx}>{item}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {!!limitList(response.concerns).length && (
                                    <div>
                                      <p className="font-semibold text-slate-700 dark:text-slate-200">
                                        Concerns
                                      </p>
                                      <ul className="list-disc list-inside space-y-1">
                                        {limitList(response.concerns).map((item, idx) => (
                                          <li key={idx}>{item}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {response.willingness_to_pay && (
                                    <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/60 p-2 text-emerald-800">
                                      <p className="font-semibold">
                                        Will pay:{' '}
                                        {response.willingness_to_pay.will_pay ? 'Yes' : 'No'}
                                      </p>
                                      {response.willingness_to_pay.price_range && (
                                        <p>Range: {response.willingness_to_pay.price_range}</p>
                                      )}
                                      {response.willingness_to_pay.reason && (
                                        <p>{response.willingness_to_pay.reason}</p>
                                      )}
                                    </div>
                                  )}
                                  {!!limitList(response.adoption_barriers).length && (
                                    <div>
                                      <p className="font-semibold text-slate-700 dark:text-slate-200">
                                        Adoption Barriers
                                      </p>
                                      <ul className="list-disc list-inside space-y-1">
                                        {limitList(response.adoption_barriers).map((item, idx) => (
                                          <li key={idx}>{item}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {response.verdict && (
                                    <Badge variant="secondary" className="text-[10px]">
                                      Verdict: {response.verdict}
                                    </Badge>
                                  )}
                                </div>
                              )}

                              {isActive && response && (
                                <div className="space-y-2 border-t border-slate-200/60 pt-3">
                                  <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                                    {(chatHistory[persona.id] || []).map((entry, idx) => (
                                      <div
                                        key={idx}
                                        className={`rounded-lg px-3 py-2 ${
                                          entry.role === 'founder'
                                            ? 'bg-indigo-50 text-indigo-800'
                                            : 'bg-slate-200/70 text-slate-700'
                                        }`}
                                      >
                                        <span className="font-semibold">
                                          {entry.role === 'founder' ? 'You' : persona.name}:
                                        </span>{' '}
                                        {entry.message}
                                      </div>
                                    ))}
                                  </div>
                                  <textarea
                                    value={rebuttalMessage}
                                    onChange={event => setRebuttalMessage(event.target.value)}
                                    placeholder="Respond to this persona..."
                                    rows={3}
                                    className="w-full rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => handleRebuttalSubmit(persona.id)}
                                    disabled={interviewLoadingId === persona.id}
                                    className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white"
                                  >
                                    {interviewLoadingId === persona.id
                                      ? 'Sending...'
                                      : 'Send rebuttal'}
                                  </Button>
                                  {response.bullets?.length ? (
                                    <div className="text-xs text-slate-600 dark:text-slate-300">
                                      <p className="font-semibold text-slate-700 dark:text-slate-200">
                                        Latest reaction
                                      </p>
                                      <ul className="list-disc list-inside">
                                        {limitList(response.bullets).map((item, idx) => (
                                          <li key={idx}>{item}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  ) : null}
                                  {response.follow_up_questions?.length ? (
                                    <div className="text-xs text-slate-600 dark:text-slate-300">
                                      <p className="font-semibold text-slate-700 dark:text-slate-200">
                                        Follow-up questions
                                      </p>
                                      <ul className="list-disc list-inside">
                                        {limitList(response.follow_up_questions).map(
                                          (item, idx) => (
                                            <li key={idx}>{item}</li>
                                          )
                                        )}
                                      </ul>
                                    </div>
                                  ) : null}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                  {data.message || 'Verdict is not ready yet.'}
                </div>
              )}

              <details className="rounded-xl border border-slate-200 bg-white p-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate-600">
                  Raw response (for debugging)
                </summary>
                <pre className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 overflow-auto text-xs">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </Container>
      </Section>
    </AppShell>
  )
}
