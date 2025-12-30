'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card'
import { Button } from '@/components/button'
import { Badge } from '@/components/badge'
import { useAuth } from '@/app/providers/auth-provider'
import { useCredits } from '@/app/providers/credits-provider'
import { toast } from 'sonner'
import { startValidation, getActiveDebates } from '@/lib/arena-service'
import { CheckCircle, MessageTextCircle01, FileShield01, Target01 } from '@untitledui/icons'
import { BuyCreditsModal } from '@/components/buy-credits-modal'

interface ValidationResponse {
  debate_id?: string
  idea_title?: string
}

interface ActiveDebateItem {
  id: string
  ideaTitle?: string | null
  status: string
  createdAt?: string | null
}

const LOCAL_ACTIVE_KEY = 'ideaaudit_active_validations'

const steps = [
  {
    title: 'Submit PRD',
    body: 'Paste your idea, goal, and constraints. Keep it concise but specific.',
    icon: Target01,
  },
  {
    title: 'Live Debate',
    body: 'Agents challenge assumptions and surface risks in near real time.',
    icon: MessageTextCircle01,
  },
  {
    title: 'Verdict & Actions',
    body: 'Get a clear proceed / pivot / kill call plus next-step experiments.',
    icon: FileShield01,
  },
]

export default function ValidatePage() {
  const { user, loading } = useAuth()
  const { credits, setCredits } = useCredits()
  const router = useRouter()
  const [prd, setPrd] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ValidationResponse | null>(null)
  const [activeDebates, setActiveDebates] = useState<ActiveDebateItem[]>([])
  const [activeLoading, setActiveLoading] = useState(false)
  const [showCreditsModal, setShowCreditsModal] = useState(false)

  const readLocalActive = (): ActiveDebateItem[] => {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(LOCAL_ACTIVE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const writeLocalActive = (items: ActiveDebateItem[]) => {
    if (typeof window === 'undefined') return
    localStorage.setItem(LOCAL_ACTIVE_KEY, JSON.stringify(items))
  }

  const upsertActive = (item: ActiveDebateItem) => {
    setActiveDebates(prev => {
      const dedup = new Map(prev.map(v => [v.id, v]))
      dedup.set(item.id, { ...dedup.get(item.id), ...item })
      const next = Array.from(dedup.values())
      writeLocalActive(next)
      return next
    })
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login?redirect=/validate')
    }
  }, [loading, user, router])

  useEffect(() => {
    // Prefill from local cache so newly started validations show immediately after refresh
    const local = readLocalActive()
    if (local.length) {
      setActiveDebates(local)
    }

    if (!user) return
    async function loadActive() {
      try {
        setActiveLoading(true)
        const items = await getActiveDebates()
        // Merge server view with any locally cached records
        const dedup = new Map<string, ActiveDebateItem>()
        ;[...local, ...items].forEach(v => dedup.set(v.id, v))
        const merged = Array.from(dedup.values())
        setActiveDebates(merged)
        writeLocalActive(merged)
      } catch (err) {
        console.error('Failed to load active debates', err)
      } finally {
        setActiveLoading(false)
      }
    }
    loadActive()
  }, [user])

  const disabled = useMemo(() => !prd.trim() || isSubmitting, [prd, isSubmitting])

  async function handleValidate() {
    if (!prd.trim()) return
    if (credits !== null && credits <= 0) {
      setShowCreditsModal(true)
      return
    }
    try {
      setIsSubmitting(true)
      setError(null)
      setResult(null)
      const data = await startValidation(prd)
      setResult(data)
      if (data?.debate_id) {
        upsertActive({ id: data.debate_id, ideaTitle: data.idea_title, status: 'pending' })
      }
      if (credits !== null) {
        setCredits(Math.max(credits - 1, 0))
      }
      toast.success('Validation started. Jump into the debate or verdict tabs.')
    } catch (err: any) {
      const status = err?.response?.status
      const message = err?.response?.data?.detail || err?.message || 'Failed to start validation'
      if (status === 402) {
        setShowCreditsModal(true)
      }
      setError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20 text-slate-500">Loading...</div>
      </AppShell>
    )
  }

  if (!user) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20 text-slate-500">
          Redirecting to login…
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <BuyCreditsModal open={showCreditsModal} onClose={() => setShowCreditsModal(false)} />
      <div className="space-y-10">
        <div className="flex flex-col gap-3">
          <Badge
            variant="secondary"
            className="w-fit border-0 bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white shadow-sm"
          >
            Validate Product
          </Badge>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
                Kick off a{' '}
                <span className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] bg-clip-text text-transparent">
                  validation
                </span>
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300 mt-2 max-w-2xl">
                Paste your PRD and launch an agentic debate. We will surface risks, assumptions, and
                a final verdict.
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => router.push('/audits')}
            >
              View past audits
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <Card className="shadow-xl">
            <CardHeader className="space-y-1">
              <CardTitle>PRD / Idea description</CardTitle>
              <CardDescription>
                Be explicit about the user, problem, success criteria, and constraints.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/30 px-4 py-3 text-sm text-red-700 dark:text-red-200">
                  {error}
                </div>
              )}
              <textarea
                rows={12}
                value={prd}
                onChange={e => setPrd(e.target.value)}
                placeholder="What are you building, for whom, and why now? Include acceptance criteria, rollout, and risks."
                className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-gray-900/70 px-4 py-3 text-base text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                disabled={isSubmitting}
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  We store this securely to generate the debate and verdict.
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setPrd('')}
                    disabled={!prd || isSubmitting}
                  >
                    Clear
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)]"
                    onClick={handleValidate}
                    disabled={disabled}
                  >
                    {isSubmitting ? 'Starting...' : 'Validate now'}
                  </Button>
                </div>
              </div>

              {result?.debate_id && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-900/30 px-4 py-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-200">
                    <CheckCircle className="h-4 w-4" /> Validation started
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-200">
                    {result.idea_title || 'Untitled idea'}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link href={`/debate/${result.debate_id}`}>
                      <Button size="sm" variant="secondary">
                        Debate / Transcript
                      </Button>
                    </Link>
                    <Link href={`/verdict/${result.debate_id}`}>
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)]"
                      >
                        Verdict / Result
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="shadow-lg">
              <CardHeader className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">Active validations</CardTitle>
                  <CardDescription>Resume any pending or running debate.</CardDescription>
                </div>
                <Link href="/active">
                  <Button variant="secondary" size="sm">
                    See all
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeLoading && (
                  <p className="text-sm text-slate-600 dark:text-slate-300">Loading…</p>
                )}
                {!activeLoading && activeDebates.length === 0 && (
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    No active validations right now.
                  </p>
                )}
                {!activeLoading && activeDebates.length > 0 && (
                  <div className="space-y-3">
                    {activeDebates.slice(0, 3).map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-gray-900/70 px-3 py-2"
                      >
                        <div>
                          <p className="font-semibold text-sm">
                            {item.ideaTitle || 'Untitled idea'}
                          </p>
                          <p className="text-xs text-slate-500">{item.status || 'pending'}</p>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/debate/${item.id}`}>
                            <Button size="sm" variant="secondary">
                              Debate
                            </Button>
                          </Link>
                          <Link href={`/verdict/${item.id}`}>
                            <Button
                              size="sm"
                              className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)]"
                            >
                              Verdict
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target01 className="h-5 w-5" /> What to include
                </CardTitle>
                <CardDescription>Give the agents enough context to argue well.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
                <ul className="space-y-2 list-disc list-inside">
                  <li>User, problem, and success metrics</li>
                  <li>Current solution and alternatives</li>
                  <li>Risks, unknowns, and blockers</li>
                  <li>Rollout plan and acceptance criteria</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>How it works</CardTitle>
                <CardDescription>Debate → transcript → verdict.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {steps.map(step => (
                  <div
                    key={step.title}
                    className="flex gap-3 rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-gray-900/70 p-3"
                  >
                    <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200">
                      <step.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold">{step.title}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{step.body}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
