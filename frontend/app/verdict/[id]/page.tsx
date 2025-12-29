'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Section, Container } from '@/components/section'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'

type VerdictResponse = {
  debate_id: string
  verdict: Verdict | null
  status: string
  message: string
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

type Verdict = {
  decision: string
  scorecard?: Scorecard
  kill_shots?: KillShot[]
  assumptions?: string[]
  test_plan?: TestPlanItem[]
  reasoning?: string
  confidence?: number
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

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength).trim()}…`
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
  const [data, setData] = useState<VerdictResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  async function fetchVerdict() {
    try {
      setLoading(true)
      setError(null)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
      const res = await fetch(`${apiUrl}/arena/debate/${id}/verdict`)
      if (!res.ok) throw new Error(`Failed: ${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch verdict')
    } finally {
      setLoading(false)
      setLastUpdated(new Date().toLocaleTimeString())
    }
  }

  useEffect(() => {
    if (!id) return
    fetchVerdict()
  }, [id])

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
              <span className="text-lg">⚖️</span> Final Verdict Report
            </Badge>
            <h1 className="text-5xl sm:text-6xl font-black mb-3">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 dark:from-purple-400 dark:via-pink-400 dark:to-blue-400">
                Idea Validation
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-6 font-medium">
              Comprehensive Analysis & Recommendations
            </p>

            <div className="inline-flex items-center gap-3 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-full px-6 py-3 shadow-lg border border-slate-200/50 dark:border-slate-700/50 mb-6">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                {id || '—'}
              </span>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <Badge variant={statusBadgeVariant as any} className="text-xs">
                {data?.status || 'pending'}
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
                onClick={fetchVerdict}
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
              <a href={`/debate/${id}`}>
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
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  View Transcript
                </Button>
              </a>
            </div>
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
                        Verdict: <span className={decisionStyle.accent}>{decisionStyle.label}</span>
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
                        a.download = `arena-verdict-${id}.json`
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                        URL.revokeObjectURL(url)
                      }}
                      className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
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
                              <span className="text-gray-500 dark:text-gray-400 text-sm">/100</span>
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
  )
}
