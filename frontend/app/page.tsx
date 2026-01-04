'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from './providers/auth-provider'
import { getRecentVerdicts, startValidation } from '@/lib/arena-service'
import { getPricingConfig } from '@/lib/billing-service'
import { Button } from '@/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card'
import { Badge } from '@/components/badge'
import { Section, Container } from '@/components/section'
import { ThemeToggle } from '@/components/theme-toggle'
import { Logo } from '@/components/logo'
import { cn } from '@/lib/utils'
import {
  CheckCircle,
  Target01,
  Users01,
  Database01,
  MessageTextCircle01,
  FileShield01,
  ArrowRight,
  PlayCircle,
  LayoutLeft,
  XClose,
} from '@untitledui/icons'

const PRD_STORAGE_KEY = 'ideaaudit_pending_prd'
const SHORT_MODE_MIN_LINES = 2
const SHORT_MODE_MAX_LINES = 5
const SHORT_MODE_MAX_CHARS = 400
const creditCostByMode = {
  short: 0,
  long: 2,
} as const

interface RecentVerdictItem {
  id: string
  ideaTitle?: string | null
  decision?: string
  status: string
  createdAt?: string | null
  confidence?: number
  reasoning?: string
}

export default function Home() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const pricing = useMemo(() => getPricingConfig(), [])
  const packMap = useMemo(() => {
    const map: Record<string, { price: number; credits: number }> = {}
    pricing.packs.forEach(pack => {
      map[pack.id] = { price: pack.price, credits: pack.credits }
    })
    return map
  }, [pricing])
  const [prdText, setPrdText] = useState('')
  const [validationMode, setValidationMode] = useState<'short' | 'long'>('short')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successDebateId, setSuccessDebateId] = useState<string | null>(null)
  const [successIdeaTitle, setSuccessIdeaTitle] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [recentVerdicts, setRecentVerdicts] = useState<RecentVerdictItem[]>([])
  const [loadingAudits, setLoadingAudits] = useState(false)
  const rotatingWords = ['Bad Ideas', 'Weak Concepts', 'Shaky Pitches', 'Dead-End Plans']
  const [wordIndex, setWordIndex] = useState(0)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const prdLineCount = useMemo(() => {
    return prdText
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean).length
  }, [prdText])

  const shortModeError = useMemo(() => {
    if (validationMode !== 'short') return null
    if (prdText.length > SHORT_MODE_MAX_CHARS) {
      return `Keep it under ${SHORT_MODE_MAX_CHARS} characters for Short mode.`
    }
    if (prdLineCount < SHORT_MODE_MIN_LINES) {
      return `Add at least ${SHORT_MODE_MIN_LINES} lines for Short mode.`
    }
    if (prdLineCount > SHORT_MODE_MAX_LINES) {
      return `Limit to ${SHORT_MODE_MAX_LINES} lines for Short mode.`
    }
    return null
  }, [prdText, prdLineCount, validationMode])

  const creditCost = creditCostByMode[validationMode]

  // Restore PRD text from session storage after login
  useEffect(() => {
    if (!loading && user) {
      const pendingPrd = sessionStorage.getItem(PRD_STORAGE_KEY)
      if (pendingPrd) {
        setPrdText(pendingPrd)
        sessionStorage.removeItem(PRD_STORAGE_KEY)
        toast.success('Your PRD has been restored. Ready to validate!')
        // Scroll to the validation section
        setTimeout(() => {
          const validateSection = document.getElementById('validate-now')
          validateSection?.scrollIntoView({ behavior: 'smooth' })
        }, 500)
      }
    }
  }, [user, loading])

  // Fetch recent audits for logged-in users
  useEffect(() => {
    if (!loading && user) {
      setLoadingAudits(true)
      getRecentVerdicts(3)
        .then(setRecentVerdicts)
        .catch(err => {
          console.error('Failed to load recent audits:', err)
        })
        .finally(() => {
          setLoadingAudits(false)
        })
    }
  }, [user, loading])

  // Debounce PRD input for smoother UX on large text
  const debouncedPrd = useMemo(() => prdText, [prdText])
  useEffect(() => {
    const t = setTimeout(() => {
      // noop: placeholder for future validations
    }, 250)
    return () => clearTimeout(t)
  }, [debouncedPrd])

  useEffect(() => {
    const intervalId = setInterval(() => {
      setWordIndex(current => (current + 1) % rotatingWords.length)
    }, 2200)
    return () => clearInterval(intervalId)
  }, [rotatingWords.length])

  async function handleValidate() {
    // Check if user is logged in
    if (!user) {
      // Store PRD text in session storage before redirecting
      if (prdText.trim()) {
        sessionStorage.setItem(PRD_STORAGE_KEY, prdText)
      }
      toast.info('Please log in to validate your idea')
      router.push('/auth/login')
      return
    }

    if (shortModeError) {
      setErrorMessage(shortModeError)
      toast.error(shortModeError)
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessDebateId(null)
    setSuccessIdeaTitle(null)
    try {
      const data = await startValidation(prdText, validationMode)
      setSuccessDebateId(data.debate_id ?? null)
      setSuccessIdeaTitle(data.idea_title ?? null)
      toast.success('Validation started. Redirect buttons enabled.')
    } catch (err: any) {
      const message = err?.response?.data?.detail || err?.message || 'Failed to validate idea'
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopySample = () => {
    navigator.clipboard.writeText(JSON.stringify(sampleVerdict, null, 2))
    toast.success('Sample report copied to clipboard')
  }

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(sampleVerdict, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ideaaudit-verdict-sample.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 dark:from-gray-900 dark:to-slate-900 text-gray-900 dark:text-white transition-colors duration-300">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-50">
        <Container className="flex items-center justify-between py-4">
          {/* Brand/Logo */}
          <div className="flex items-center space-x-3">
            <Logo className="h-12 w-auto" />
          </div>

          {/* Navigation Links */}
          <div className="hidden lg:flex items-center space-x-8">
            <a
              href="#features"
              className="group flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Features
              <svg
                className="ml-1 w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </a>
            <a
              href="#how-it-works"
              className="group flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              How It Works
              <svg
                className="ml-1 w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </a>
            <a
              href="#pricing"
              className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Pricing
            </a>
            {user && (
              <a
                href="/dashboard"
                className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Dashboard
              </a>
            )}
            {user && (
              <a
                href="/audits"
                className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                My Audits
              </a>
            )}
          </div>

          {/* Action Buttons */}
          <div className="hidden lg:flex items-center space-x-4">
            <ThemeToggle />
            {loading ? (
              <div className="px-4 py-2 text-sm text-slate-500">Loading...</div>
            ) : user ? (
              <>
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {user.displayName || user.email}
                  </span>
                  <Button onClick={logout} variant="secondary" size="sm" className="px-4 py-2">
                    Sign Out
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button asChild variant="secondary" size="sm" className="px-4 py-2">
                  <Link href="/auth/login">Sign In</Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="px-4 py-2 bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white"
                >
                  <Link href="/auth/signup">Sign Up</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center space-x-2">
            <ThemeToggle />
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white shadow"
              onClick={() => setMobileNavOpen(open => !open)}
              aria-controls="mobile-landing-nav"
              aria-expanded={mobileNavOpen}
              aria-label="Open navigation"
            >
              <LayoutLeft className="h-4 w-4" />
            </button>
          </div>
        </Container>
      </nav>

      <div
        className={cn(
          'fixed inset-0 z-50 lg:hidden transition-opacity duration-200',
          mobileNavOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        id="mobile-landing-nav"
        aria-hidden={!mobileNavOpen}
      >
        <div
          className={cn(
            'absolute inset-0 bg-black/50 transition-opacity duration-200',
            mobileNavOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={() => setMobileNavOpen(false)}
          aria-hidden
        />
        <div
          className={cn(
            'relative h-full w-80 max-w-[80vw] bg-white dark:bg-gray-900 border-r border-slate-200 dark:border-slate-800 p-6 shadow-2xl flex flex-col transition-transform duration-200 ease-out',
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Logo className="h-12 w-auto" />
            </div>
            <button
              onClick={() => setMobileNavOpen(false)}
              className="h-10 w-10 inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white shadow"
              aria-label="Close navigation"
            >
              <XClose className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 space-y-2">
            <a
              href="#features"
              onClick={() => setMobileNavOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileNavOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              How It Works
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileNavOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Pricing
            </a>
            {user && (
              <Link
                href="/dashboard"
                onClick={() => setMobileNavOpen(false)}
                className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Dashboard
              </Link>
            )}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            {loading ? (
              <div className="text-sm text-slate-500 px-2">Loading...</div>
            ) : user ? (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Signed in</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  {user.displayName || user.email}
                </p>
                <Button
                  onClick={() => {
                    setMobileNavOpen(false)
                    logout()
                  }}
                  variant="secondary"
                  size="sm"
                  className="w-full"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="secondary" size="sm">
                  <Link href="/auth/login" onClick={() => setMobileNavOpen(false)}>
                    Sign In
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white"
                >
                  <Link href="/auth/signup" onClick={() => setMobileNavOpen(false)}>
                    Sign Up
                  </Link>
                </Button>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.14em] text-slate-500">Theme</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <Section className="relative overflow-hidden pt-32 pb-16 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
        {/* Decorative background */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-purple-300/40 to-indigo-300/40 blur-3xl" />
          <div className="absolute top-40 -right-24 h-80 w-80 rounded-full bg-gradient-to-br from-pink-300/30 to-orange-300/30 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-40 w-[70%] rounded-[80px] bg-gradient-to-r from-blue-200/30 to-purple-200/30 blur-2xl" />
        </div>
        <Container className="text-center">
          <Badge
            variant="secondary"
            className="mb-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            🚀 The Future of Idea Validation
          </Badge>
          <style>{`
            @keyframes word-fade {
              0% { opacity: 0; transform: translateY(12px); }
              20% { opacity: 1; transform: translateY(0); }
              80% { opacity: 1; transform: translateY(0); }
              100% { opacity: 0; transform: translateY(-8px); }
            }
            .word-cycle {
              display: inline-block;
              animation: word-fade 2.2s ease-in-out;
              will-change: transform, opacity;
            }
          `}</style>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6 leading-tight">
            Stop Wasting Time on&nbsp;
            <span className="relative block w-full align-bottom text-center sm:inline-block sm:w-auto sm:text-left">
              <span className="invisible block w-full sm:inline-block sm:w-auto sm:whitespace-nowrap">
                {rotatingWords.reduce((longest, word) =>
                  word.length > longest.length ? word : longest
                )}
              </span>
              <span
                key={rotatingWords[wordIndex]}
                className="word-cycle absolute inset-0 flex items-start justify-center bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] bg-clip-text text-transparent sm:inset-auto sm:left-0 sm:top-0 sm:block sm:whitespace-nowrap"
              >
                {rotatingWords[wordIndex]}
              </span>
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            IdeaAudit is an agentic system that disagrees by default and validates ideas through
            structured adversarial reasoning. Get clear verdicts: Proceed, Pivot, Kill, or Needs
            More Data.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <a href="#validate-now">
              <Button
                size="lg"
                className="text-lg px-8 py-4 bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)]"
              >
                Try IdeaAudit Free →
              </Button>
            </a>
            <Button variant="secondary" size="lg" className="text-lg px-8 py-4">
              ▶️ Watch Demo
            </Button>
          </div>
          <div className="flex items-center justify-center space-x-8 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>No Credit Card Required</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>2 Free Validations</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Instant Results</span>
            </div>
          </div>

          {/* Animated AI Element */}
          <div className="mt-12 flex justify-center">
            <style>{`
              @keyframes soft-glow {
                0%, 100% {
                  box-shadow: 0 0 30px rgba(168, 85, 247, 0.3);
                }
                50% {
                  box-shadow: 0 0 60px rgba(168, 85, 247, 0.5);
                }
              }
              @keyframes float-smooth {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-12px); }
              }
              @keyframes dot-pulse {
                0%, 100% {
                  transform: scale(1);
                  opacity: 0.6;
                }
                50% {
                  transform: scale(1.3);
                  opacity: 1;
                }
              }
              .ai-container {
                animation: float-smooth 5s ease-in-out infinite;
              }
              .ai-glow {
                animation: soft-glow 4s ease-in-out infinite;
              }
              .dot-animate {
                animation: dot-pulse 2s ease-in-out infinite;
              }
            `}</style>
            <div className="ai-container relative">
              {/* Main container with glow */}
              <div className="ai-glow bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] rounded-3xl px-12 py-8 shadow-2xl backdrop-blur-sm relative overflow-hidden">
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-3xl pointer-events-none"></div>

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center gap-4">
                  {/* Brain Icon */}
                  <div className="text-6xl drop-shadow-lg">🧠</div>

                  {/* Thinking dots */}
                  <div className="flex gap-2 items-center justify-center">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="dot-animate w-2.5 h-2.5 rounded-full bg-cyan-300 shadow-lg"
                        style={{
                          animationDelay: `${i * 0.2}s`,
                        }}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Outer glow ring */}
              <div className="absolute -inset-4 rounded-3xl border border-purple-300/30 dark:border-purple-500/20 pointer-events-none"></div>
            </div>
          </div>
          <div className="mt-8 text-center">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              AI Debate Assistant Ready
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Powered by Advanced Intelligence
            </p>
          </div>
        </Container>
      </Section>

      {/* Features Section */}
      <Section id="features" className="bg-white dark:bg-gray-900">
        <Container>
          <div className="text-center mb-16">
            <Badge variant="brand" className="mb-4">
              Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Founders Choose IdeaAudit
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Built for the harsh reality of entrepreneurship. IdeaAudit doesn't encourage—it
              validates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4 text-2xl">
                  🤖
                </div>
                <CardTitle>Multi-Agent Debate</CardTitle>
                <CardDescription>
                  5 specialized AI agents debate your idea from every angle: Skeptic, Customer,
                  Market, Builder, and Judge.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group relative border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-2xl dark:shadow-slate-800/50 transition-all duration-300 bg-white dark:bg-slate-800 hover:scale-[1.02] hover:-translate-y-1">
              <CardHeader className="text-center pb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">🛡️</span>
                </div>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                  Evidence Tagging
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Every claim is tagged: Verified, Assumption, or Needs Validation. Crystal-clear
                  feedback.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group relative border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-2xl dark:shadow-slate-800/50 transition-all duration-300 bg-white dark:bg-slate-800 hover:scale-[1.02] hover:-translate-y-1">
              <CardHeader className="text-center pb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">🎯</span>
                </div>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                  Clear Verdicts
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Get definitive answers: Proceed, Pivot, Kill, or Needs More Data. No sugarcoating.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-2xl transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4 text-2xl">
                  🧭
                </div>
                <CardTitle>Pivot Generator</CardTitle>
                <CardDescription>
                  If the idea fails, we don’t stop there. You get three concrete pivot paths to
                  rescue it.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-2xl transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4 text-2xl">
                  💼
                </div>
                <CardTitle>Investor Readiness Score</CardTitle>
                <CardDescription>
                  A VC-style scorecard that grades how likely you are to get a meeting today.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-2xl transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <MessageTextCircle01 className="w-6 h-6 text-indigo-600" />
                </div>
                <CardTitle>Boardroom Transcript</CardTitle>
                <CardDescription>
                  Share a polished transcript that reads like a real investment committee review.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </Container>
      </Section>

      {/* How It Works */}
      <Section id="how-it-works" className="bg-white dark:bg-slate-900 py-24 sm:py-32">
        <Container>
          <div className="text-center mb-16">
            <div className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-4 py-2 mb-8 border border-slate-200 dark:border-slate-700">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                🔄 The Process
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
              From Idea to Verdict in{' '}
              <span className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] bg-clip-text text-transparent">
                5 Rounds
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Watch your idea get stress-tested through a structured adversarial debate protocol.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 lg:gap-8">
            {[
              {
                step: '01',
                title: 'Clarification',
                description:
                  'Judge forces clear articulation of problem, user, value, and assumptions.',
                gradient: 'from-blue-500 to-cyan-500',
                icon: '🔍',
              },
              {
                step: '02',
                title: 'Independent Attacks',
                description: 'Skeptic, Customer, and Market agents attack your idea independently.',
                gradient: 'from-red-500 to-pink-500',
                icon: '⚔️',
              },
              {
                step: '03',
                title: 'Defense',
                description: 'Builder provides constrained defense using only stated facts.',
                gradient: 'from-purple-500 to-indigo-500',
                icon: '🛡️',
              },
              {
                step: '04',
                title: 'Cross-Examination',
                description: "All agents challenge each other's strongest claims and assumptions.",
                gradient: 'from-orange-500 to-yellow-500',
                icon: '⚖️',
              },
              {
                step: '05',
                title: 'Final Verdict',
                description: 'Judge aggregates evidence and delivers final verdict with scorecard.',
                gradient: 'from-green-500 to-emerald-500',
                icon: '🏆',
              },
            ].map((item, index) => (
              <div key={index} className="group text-center">
                <div className="relative mb-6">
                  <div
                    className={`w-16 h-16 bg-gradient-to-br ${item.gradient} rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110`}
                  >
                    <span className="text-2xl">{item.icon}</span>
                  </div>
                  {index < 4 && (
                    <div className="hidden lg:block absolute top-8 left-full w-8 h-0.5 bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500 ml-4"></div>
                  )}
                </div>
                <div
                  className={`text-sm font-bold bg-gradient-to-r ${item.gradient} bg-clip-text text-transparent mb-3`}
                >
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 leading-tight">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Demo Section */}
      <Section
        id="validate-now"
        className="bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-24"
      >
        <Container size="lg">
          <div className="text-center mb-16">
            <div className="inline-flex items-center rounded-full bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] px-4 py-2 mb-6">
              <span className="text-sm text-white font-semibold bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] bg-clip-text text-transparent">
                🎯 Try It Now
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              See IdeaAudit in{' '}
              <span className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] bg-clip-text text-transparent">
                Action
              </span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
              Upload your business idea and get a real validation in seconds.
            </p>
          </div>

          <Card className="max-w-4xl mx-auto shadow-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                🚀 Validate Your Idea
              </CardTitle>
              <CardDescription className="text-lg text-gray-600 dark:text-gray-300">
                Enter your business idea details below and see how IdeaAudit evaluates it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 px-8 pb-8">
              {successDebateId && (
                <div className="rounded-xl border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/30 p-4 text-left">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-green-700 dark:text-green-300">
                        Validation started for
                      </p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {successIdeaTitle || 'Untitled Idea'}
                      </p>
                    </div>
                    <Badge variant="success">Debate Started</Badge>
                  </div>
                  <div className="mt-3 text-xs break-all font-mono opacity-70">
                    ID: {successDebateId}
                  </div>
                  <div className="mt-4 flex gap-3">
                    <a href={`/debate/${successDebateId}`}>
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)]"
                      >
                        View Status
                      </Button>
                    </a>
                    <a href={`/verdict/${successDebateId}`}>
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)]"
                      >
                        View Verdict
                      </Button>
                    </a>
                  </div>
                </div>
              )}
              {errorMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/30 p-4 text-left">
                  <p className="font-semibold text-red-700 dark:text-red-300">Error</p>
                  <p className="text-sm text-red-700/80 dark:text-red-300/80">{errorMessage}</p>
                </div>
              )}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  📝 Business Idea Description
                </label>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Choose validation mode
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Short runs 2 rounds and is free (1/day). Long runs 5 rounds (2 credits).
                    </p>
                  </div>
                  <div className="flex rounded-full border border-gray-200 dark:border-gray-600 bg-white/80 dark:bg-gray-700/60 p-1">
                    <Button
                      size="sm"
                      variant={validationMode === 'short' ? 'primary' : 'secondary'}
                      className={
                        validationMode === 'short'
                          ? 'rounded-full bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)]'
                          : 'rounded-full'
                      }
                      onClick={() => setValidationMode('short')}
                    >
                      Short
                    </Button>
                    <Button
                      size="sm"
                      variant={validationMode === 'long' ? 'primary' : 'secondary'}
                      className={
                        validationMode === 'long'
                          ? 'rounded-full bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)]'
                          : 'rounded-full'
                      }
                      onClick={() => setValidationMode('long')}
                    >
                      Long
                    </Button>
                  </div>
                </div>
                <textarea
                  placeholder={
                    validationMode === 'short'
                      ? 'Describe your idea in 2–5 lines (user, problem, value, why now).'
                      : 'Paste your PRD or full spec here. Include user, problem, goals, metrics.'
                  }
                  value={prdText}
                  onChange={e => setPrdText(e.target.value)}
                  rows={validationMode === 'short' ? 6 : 10}
                  className="w-full h-32 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-y px-4 py-3"
                />
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    {validationMode === 'short'
                      ? `Short mode: ${prdLineCount}/${SHORT_MODE_MAX_LINES} lines • ${prdText.length}/${SHORT_MODE_MAX_CHARS} chars • 1 free/day`
                      : 'Long mode: no hard limit.'}
                  </span>
                  {shortModeError && <span className="text-red-500">{shortModeError}</span>}
                </div>
              </div>

              {/* Backend only needs PRD text right now */}

              <div className="flex justify-center pt-4">
                <Button
                  onClick={handleValidate}
                  disabled={isSubmitting || !prdText.trim() || Boolean(shortModeError)}
                  className="group px-12 py-4 text-lg font-semibold bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white border-0 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="mr-3">{isSubmitting ? '⏳' : '✨'}</span>
                  {isSubmitting
                    ? 'Starting Validation…'
                    : validationMode === 'short'
                      ? 'Validate • Free'
                      : `Validate • ${creditCost} credits`}
                  <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>

              <div className="text-center pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  🔒 <strong>Free & Secure:</strong> No credit card required • Quick Roast is free
                  (1/day) • Full PRDs are 2 credits
                </p>
              </div>
            </CardContent>
          </Card>
        </Container>
      </Section>

      {/* Recent Audits Section - Only for logged-in users */}
      {user && (
        <Section className="bg-gradient-to-b from-blue-50 via-white to-slate-50 dark:from-gray-800 dark:via-gray-900 dark:to-slate-900 py-20">
          <Container size="lg">
            <div className="text-center mb-12">
              <Badge
                variant="secondary"
                className="mb-6 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/40 dark:to-purple-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 px-4 py-2 shadow-sm"
              >
                <span className="text-lg">📋</span> Your Recent Audits
              </Badge>
              <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                Recent Validations
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Your latest PRD audit verdicts at a glance
              </p>
            </div>

            {loadingAudits ? (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-300">Loading your audits...</p>
              </div>
            ) : recentVerdicts.length === 0 ? (
              <Card className="max-w-2xl mx-auto shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 text-center p-12">
                <div className="text-5xl mb-4">🚀</div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  No Audits Yet
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Start validating your first PRD idea above to see it here!
                </p>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {recentVerdicts.map(verdict => {
                    const decisionLower = (verdict.decision || '').toLowerCase()
                    let badgeVariant: any = 'secondary'
                    if (decisionLower === 'proceed') badgeVariant = 'success'
                    else if (decisionLower === 'pivot') badgeVariant = 'warning'
                    else if (decisionLower === 'kill') badgeVariant = 'destructive'

                    return (
                      <Link key={verdict.id} href={`/verdict/${verdict.id}`}>
                        <Card className="shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 overflow-hidden group cursor-pointer h-full">
                          <CardHeader>
                            <div className="flex items-start justify-between mb-2">
                              <Badge variant={badgeVariant}>
                                {(verdict.decision || 'Unknown').charAt(0).toUpperCase() +
                                  (verdict.decision || 'Unknown').slice(1)}
                              </Badge>
                              {verdict.confidence && (
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                  {Math.round(verdict.confidence)}%
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
                                  })
                                : 'Date unknown'}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {verdict.reasoning && (
                              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
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
                        </Card>
                      </Link>
                    )
                  })}
                </div>
                <div className="text-center">
                  <Link href="/audits">
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)]"
                    >
                      View All Audits
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </Container>
        </Section>
      )}

      {/* Sample Output */}
      <Section
        variant="light"
        className="bg-gradient-to-b from-white via-slate-50 to-blue-50 dark:from-gray-900 dark:via-slate-900 dark:to-blue-900 py-20"
      >
        <Container>
          <div className="text-center mb-16 relative">
            {/* Decorative blur */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-r from-purple-300/20 to-pink-300/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative">
              <Badge
                variant="secondary"
                className="mb-6 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 px-4 py-2 shadow-sm"
              >
                <span className="text-lg">📊</span> Sample Output
              </Badge>
              <h2 className="text-4xl sm:text-5xl font-black mb-4">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)]">
                  What You Get Back
                </span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto font-medium">
                Comprehensive analysis with clear next steps and actionable insights.
              </p>
            </div>
          </div>

          <div className="max-w-5xl mx-auto">
            <Card className="shadow-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              {/* Report Header */}
              <div className="border-b-2 border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-purple-50/50 via-pink-50/50 to-blue-50/50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-blue-900/20 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-3xl font-black text-gray-900 dark:text-white">
                      Verdict:{' '}
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">
                        {sampleVerdict.verdict.decision}
                      </span>
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <Badge
                      variant="warning"
                      className="text-base px-4 py-2 bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border-yellow-200 shadow-md"
                    >
                      Overall Score: {sampleVerdict.verdict.scorecard.overall_score}/100
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="text-xs bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                    >
                      {sampleVerdict.verdict.confidence * 100}% Confidence
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-200 font-semibold">
                    Idea: {sampleVerdict.idea_title}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleDownloadJson}
                    className="flex items-center gap-2 bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)]"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    onClick={handleCopySample}
                    className="flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  {Object.entries(sampleVerdict.verdict.scorecard).map(([key, score]) => (
                    <div
                      key={key}
                      className={`${key === 'overall_score' ? 'col-span-2 md:col-span-5 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900' : 'bg-gray-50 dark:bg-gray-900/50'} p-4 rounded-xl border ${key === 'overall_score' ? 'border-slate-300 dark:border-slate-600' : 'border-gray-100 dark:border-gray-700'} shadow-sm`}
                    >
                      <div
                        className={`text-xs text-gray-500 uppercase tracking-wider mb-2 ${key === 'overall_score' ? 'text-center' : ''}`}
                      >
                        {key.replace('_score', '').replace('_', ' ')}
                      </div>
                      <div
                        className={`flex items-end gap-2 ${key === 'overall_score' ? 'justify-center' : ''}`}
                      >
                        <span
                          className={`${key === 'overall_score' ? 'text-5xl' : 'text-2xl'} font-bold ${score < 40 ? 'text-red-500' : score < 70 ? 'text-yellow-500' : 'text-green-500'}`}
                        >
                          {score}
                        </span>
                        <span
                          className={`text-gray-400 ${key === 'overall_score' ? 'text-lg mb-2' : 'text-sm mb-1'}`}
                        >
                          /100
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full mt-3">
                        <div
                          className={`h-2 rounded-full transition-all ${score < 40 ? 'bg-red-500' : score < 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${score}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reasoning */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 p-5 rounded-xl border-2 border-blue-200 dark:border-blue-800 shadow-sm">
                  <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                    <span className="text-2xl">💡</span> Executive Summary
                  </h4>
                  <p className="text-blue-900 dark:text-blue-200 text-sm leading-relaxed">
                    {sampleVerdict.verdict.reasoning}
                  </p>
                  <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800 flex items-center justify-between">
                    <span className="text-xs text-blue-700 dark:text-blue-300">
                      Confidence:{' '}
                      <span className="font-bold">
                        {(sampleVerdict.verdict.confidence * 100).toFixed(0)}%
                      </span>
                    </span>
                    <Badge variant="warning" className="text-xs">
                      {sampleVerdict.verdict.kill_shots.length} Critical Issues Found
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 p-5 shadow-sm">
                    <h4 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <span className="text-xl">🧭</span> Pivot Generator
                    </h4>
                    <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                      {sampleVerdict.verdict.pivot_ideas.map((pivot, idx) => (
                        <li
                          key={idx}
                          className="rounded-lg border border-slate-200/70 dark:border-slate-700/70 bg-slate-50 dark:bg-slate-800/60 px-3 py-2"
                        >
                          {pivot}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/70 dark:bg-emerald-900/20 p-5 shadow-sm">
                    <h4 className="font-bold text-emerald-900 dark:text-emerald-100 mb-3 flex items-center gap-2">
                      <span className="text-xl">💼</span> Investor Readiness
                    </h4>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="text-3xl font-black text-emerald-600 dark:text-emerald-300">
                        {sampleVerdict.verdict.investor_readiness.score}
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                          {sampleVerdict.verdict.investor_readiness.verdict}
                        </p>
                        <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
                          Likelihood of a VC meeting today.
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-2 text-sm text-emerald-900 dark:text-emerald-100">
                      {sampleVerdict.verdict.investor_readiness.reasons.map((reason, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Kill Shots */}
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <span className="text-red-500">🎯</span> Critical Kill-Shots
                      <Badge variant="destructive" className="text-xs">
                        {sampleVerdict.verdict.kill_shots.length}
                      </Badge>
                    </h4>
                    <div className="space-y-3 max-h-none sm:max-h-[800px] overflow-y-auto pr-0 sm:pr-2">
                      {sampleVerdict.verdict.kill_shots.map((shot, i) => (
                        <div
                          key={i}
                          className="p-4 rounded-xl border-2 border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="font-bold text-red-900 dark:text-red-200 text-sm leading-tight">
                              {shot.title}
                            </span>
                            <div className="flex flex-col items-end gap-1">
                              <Badge
                                variant="destructive"
                                className="text-[10px] px-2 py-0.5 h-auto whitespace-nowrap"
                              >
                                {shot.severity}
                              </Badge>
                              <span className="text-[10px] text-red-600 dark:text-red-400 font-medium">
                                by {shot.agent}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-red-800 dark:text-red-300 leading-relaxed">
                            {shot.description}
                          </p>
                        </div>
                      ))}
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
                        {sampleVerdict.verdict.test_plan.map((plan, i) => (
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
                      </div>
                    </div>

                    {/* Assumptions Preview */}
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <span className="text-amber-500">⚠️</span> Key Assumptions
                        <Badge variant="warning" className="text-xs">
                          {sampleVerdict.verdict.assumptions.length}
                        </Badge>
                      </h4>
                      <div className="space-y-2 max-h-none sm:max-h-[240px] overflow-y-auto">
                        {sampleVerdict.verdict.assumptions.slice(0, 4).map((assumption, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30"
                          >
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                              {i + 1}
                            </span>
                            <p className="text-xs text-amber-900 dark:text-amber-200 leading-tight">
                              {assumption}
                            </p>
                          </div>
                        ))}
                        {sampleVerdict.verdict.assumptions.length > 4 && (
                          <div className="text-xs text-amber-600 dark:text-amber-400 text-center italic pt-1">
                            +{sampleVerdict.verdict.assumptions.length - 4} more assumptions
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>

      {/* Testimonials / Early Adopter Stories */}
      <Section className="bg-gray-50 dark:bg-gray-800">
        <Container>
          <div className="text-center mb-16">
            <Badge variant="brand" className="mb-4">
              Stories
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              It Could Be You
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              These could be your results. Join early adopters shaping the future of idea
              validation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                quote:
                  'Could save you months by validating ideas before you build them. Get honest feedback on your concept.',
                potential: 'Potential Founder',
                result: 'After trying IdeaAudit',
                emoji: '⏰',
              },
              {
                quote:
                  "Get the truth about your idea. No more just 'that sounds good' - clear, actionable verdicts.",
                potential: 'Your Name Here',
                result: 'Using IdeaAudit',
                emoji: '💡',
              },
              {
                quote:
                  'A structured validation plan in minutes. Know exactly what to test and why it matters.',
                potential: 'Early Adopter',
                result: 'First 100 users',
                emoji: '🎯',
              },
            ].map((story, index) => (
              <Card
                key={index}
                className="border-0 shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                <CardContent className="pt-6">
                  <div className="flex mb-4 justify-center">
                    <span className="text-4xl">{story.emoji}</span>
                  </div>
                  <blockquote className="text-gray-600 dark:text-gray-300 mb-4 italic">
                    "{story.quote}"
                  </blockquote>
                  <div className="text-center">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {story.potential}
                    </div>
                    <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                      {story.result}
                    </div>
                  </div>
                  <Button size="sm" variant="secondary" className="w-full mt-4">
                    Could This Be You? →
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              🚀 Be one of the first 100 and get lifetime Pro discount
            </p>
            <a href="#validate-now">
              <Button
                size="lg"
                className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)]"
              >
                Start Your Story Today
              </Button>
            </a>
          </div>
        </Container>
      </Section>

      {/* Pricing */}
      <Section variant="light" id="pricing" className="bg-gray-50 dark:bg-gray-800">
        <Container>
          <div className="text-center mb-16">
            <Badge variant="success" className="mb-4">
              Pricing
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Start free, pay only when you want deeper validation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-6 max-w-6xl mx-auto">
            <Card className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 xl:col-span-2">
              <CardHeader>
                <CardTitle className="text-center text-gray-900 dark:text-white">Free</CardTitle>
                <div className="text-center">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">$0</span>
                  <span className="text-gray-500 dark:text-gray-400">one-time</span>
                </div>
                <CardDescription className="text-center text-gray-600 dark:text-gray-300">
                  Perfect for exploring ideas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    5 free credits (2 validations)
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Full verdict + scorecard
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Full debate transcript
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">7-day test plans</span>
                </div>
                <Button asChild variant="secondary" className="w-full mt-6">
                  <Link href="/auth/signup">Get Started Free</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 xl:col-span-2">
              <CardHeader>
                <CardTitle className="text-center text-gray-900 dark:text-white">Starter</CardTitle>
                <div className="text-center">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {pricing.currencySymbol} {packMap.starter?.price ?? 0}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">{pricing.currencyCode}</span>
                </div>
                <CardDescription className="text-center text-gray-600 dark:text-gray-300">
                  Best for quick idea checks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {packMap.starter?.credits ?? 10} credits
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Full verdict + scorecard
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Full debate transcript
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">7-day test plans</span>
                </div>
                <Button
                  asChild
                  className="w-full mt-6 bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white"
                >
                  <Link href="/pricing">Buy Credits</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 relative xl:col-span-2">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge variant="brand">Monthly</Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-center">Pro</CardTitle>
                <div className="text-center">
                  <span className="text-4xl font-bold">
                    {pricing.currencySymbol} {packMap.pro_monthly?.price ?? 0}
                  </span>
                  <span className="text-gray-500">{pricing.currencyCode}</span>
                </div>
                <CardDescription className="text-center">
                  Monthly credits for steady validation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">{packMap.pro_monthly?.credits ?? 50} credits</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Full verdict + scorecard</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Full debate transcript</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">7-day test plans</span>
                </div>
                <Button
                  asChild
                  className="w-full mt-6 bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white"
                >
                  <Link href="/pricing">Subscribe</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-500 relative xl:col-span-3">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge variant="brand">Most Popular</Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-center text-gray-900 dark:text-white">Growth</CardTitle>
                <div className="text-center">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {pricing.currencySymbol} {packMap.growth_monthly?.price ?? 0}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">{pricing.currencyCode}</span>
                </div>
                <CardDescription className="text-center text-gray-600 dark:text-gray-300">
                  Built for weekly launches
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {packMap.growth_monthly?.credits ?? 100} credits
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Full verdict + scorecard
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Full debate transcript
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">7-day test plans</span>
                </div>
                <Button
                  asChild
                  className="w-full mt-6 bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white"
                >
                  <Link href="/pricing">Subscribe</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 xl:col-span-3">
              <CardHeader>
                <CardTitle className="text-center text-gray-900 dark:text-white">Scale</CardTitle>
                <div className="text-center">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {pricing.currencySymbol} {packMap.scale_monthly?.price ?? 0}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">{pricing.currencyCode}</span>
                </div>
                <CardDescription className="text-center text-gray-600 dark:text-gray-300">
                  For teams running heavy cycles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {packMap.scale_monthly?.credits ?? 250} credits
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Full verdict + scorecard
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Full debate transcript
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">7-day test plans</span>
                </div>
                <Button variant="secondary" asChild className="w-full mt-6">
                  <Link href="/pricing">Subscribe</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>

      {/* CTA Section */}
      <Section className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white">
        <Container size="lg" className="text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to Validate Your Next Big Idea?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join thousands of founders who use IdeaAudit to make better decisions. Start free, no
            credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-gray-900 hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
            >
              <span className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] bg-clip-text text-transparent">
                Start Free Trial →
              </span>
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="border-white text-black hover:bg-white hover:text-gray-900 dark:border-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
            >
              Schedule Demo
            </Button>
          </div>
          <p className="text-sm mt-6 opacity-75">
            ⚡ 5 free credits (2 validations) • No setup required • Cancel anytime
          </p>
        </Container>
      </Section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] rounded-lg flex items-center justify-center text-xl">
                  🎯
                </div>
                <span className="text-xl font-bold">IdeaAudit</span>
              </div>
              <p className="text-gray-400 text-sm">
                Agentic idea validation platform. Disagree by default, validate with evidence.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    API
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Integrations
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Community
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Status
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2024 IdeaAudit. All rights reserved. Built with ❤️ for founders.</p>
          </div>
        </Container>
      </footer>
    </div>
  )
}

function ToastAutoDismiss({
  toast,
  onClear,
}: {
  toast: { type: 'success' | 'error'; message: string } | null
  onClear: () => void
}) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClear, 3000)
    return () => clearTimeout(t)
  }, [toast, onClear])
  return null
}

const sampleVerdict = {
  idea_title: 'SkillMatch AI',
  debate_id: '3cfdc574-55d0-432d-8387-52ffe0fe7dba',
  verdict: {
    decision: 'Pivot',
    scorecard: {
      overall_score: 28,
      market_score: 30,
      customer_score: 40,
      feasibility_score: 25,
      differentiation_score: 10,
    },
    kill_shots: [
      {
        title: 'Fatal Flaw: PDF Parsing Exclusion Creates Unusable MVP',
        description:
          "The MVP explicitly excludes resume parsing from PDFs. This is not merely an 'out of scope' item; it's a crippling omission that renders the product unusable for its primary target users (recruiters, hiring managers). The vast majority of professional resumes are submitted in PDF format. Expecting users to manually extract plain text for every candidate negates any claimed time-saving benefit and introduces an intolerable level of friction. This is a fundamental misunderstanding of recruiter workflow and makes the core value proposition impossible to deliver.",
        severity: 'critical',
        agent: 'Skeptic',
      },
      {
        title: 'Fatal Flaw: Contradictory Value Proposition and Technical Approach',
        description:
          "The core problem statement criticizes 'rigid, keyword-heavy, and lack transparent reasoning' in existing ATS systems. Yet, the proposed ML approach relies on 'TF-IDF vectorization' and 'Keyword overlap highlights.' This is a glaring contradiction. TF-IDF is inherently a keyword-based method, and 'keyword overlap highlights' explicitly confirms a keyword-centric approach. The product isn't overcoming the 'keyword-heavy' problem; it's repackaging it with slightly different terminology and basic ML techniques, offering no genuine differentiation from the problems it claims to solve.",
        severity: 'critical',
        agent: 'Skeptic',
      },
      {
        title: "Fatal Flaw: Undefined and Subjective 'Fit' Criterion",
        description:
          "The entire product hinges on defining and classifying 'Strong Fit,' 'Partial Fit,' and 'Weak Fit' with a 0-100 match score. However, there's no clear, objective definition of what constitutes these classifications or how they relate to the score. 'Job fit' is highly subjective, varies across roles, companies, and even individual hiring managers. Without a robust, quantifiable, and consistently applicable framework for defining 'fit' (and thus labeling training data), the model's classifications will be arbitrary, inconsistent, and ultimately untrustworthy, leading to rejection by users.",
        severity: 'critical',
        agent: 'Skeptic',
      },
      {
        title: 'Fatal Flaw: Non-Existent Revenue Strategy',
        description:
          'There is no business model articulated whatsoever. How will SkillMatch AI generate revenue? Per API call? Per user? Per classification? Without a clear pricing strategy, expected price points, or defined revenue streams, this idea remains a theoretical project, not a viable business. This omission is a glaring hole, indicating a fundamental lack of commercial thought.',
        severity: 'critical',
        agent: 'Skeptic',
      },
      {
        title: 'Weak Assumption: SMBs Will Readily Adopt an API-Only Solution',
        description:
          "Targeting HR teams at startups & SMBs with an API-based solution is a critical miscalculation. These organizations frequently lack the dedicated in-house technical resources (developers) to integrate and build a UI around a REST API. The assumption that they will easily integrate this product into their workflows to 'reduce screening time' when it requires significant upfront development effort on their part is highly optimistic and unlikely to materialize. This creates a massive adoption barrier for the stated primary user group.",
        severity: 'high',
        agent: 'Skeptic',
      },
    ],
    assumptions: [
      'Users are willing and able to extract resume text from PDFs or other formats before inputting it into the API.',
      'There is sufficient, diverse, and unbiased labeled data available (or can be generated) to train the ML model effectively for various roles and industries.',
      "The proposed ML techniques (TF-IDF, Logistic Regression, Cosine Similarity) are truly sufficient to provide 'explainable, transparent matching' that surpasses 'keyword-heavy' systems without requiring more advanced (and potentially less explainable) models.",
      'Target customers (especially startups/SMBs) have the technical capabilities or will invest in integrating an API-only solution into their workflows without a dedicated UI.',
      "A clear, consistent, and universally accepted definition of 'job fit' exists or can be reliably established and encoded for model training and evaluation.",
      "The 'role-agnostic dataset' mitigation effectively addresses bias in training data.",
      "'Clear explanation of results' can be measured objectively or through subjective user feedback that reliably confirms value.",
    ],
    test_plan: [
      {
        day: 1,
        task: 'Conduct qualitative interviews with 5-7 target recruiters/HR managers at SMBs to understand their current resume input workflow and the practical feasibility of manually extracting text from PDFs for screening.',
        success_criteria:
          'At least 80% of interviewees confirm PDF parsing is a critical, non-negotiable feature for any time-saving solution, indicating manual text extraction is a deal-breaker.',
      },
      {
        day: 2,
        task: "Run a workshop with 3-5 experienced recruiters/hiring managers. Present 10-15 varied resume/job description pairs and ask them to independently classify 'fit' (Strong/Partial/Weak) and articulate their precise criteria.",
        success_criteria:
          "Emergence of consistent, quantifiable criteria for each 'fit' classification that can be documented into a clear rubric, demonstrating that 'fit' can be objectively defined for model training.",
      },
      {
        day: 3,
        task: "Develop mockups/storyboards demonstrating the 'explainable' skill insights (matched/missing skills) without explicitly relying on keyword highlights. Present these to 3-5 target users.",
        success_criteria:
          "Users perceive the explanations as genuinely insightful and superior to existing 'keyword-heavy' systems, confirming a perceived differentiation beyond simple keyword matching.",
      },
      {
        day: 4,
        task: 'Present hypothetical API-only solutions (with and without PDF parsing via a 3rd party tool) to 5-7 technical leaders/decision-makers at target SMBs or potential ATS integration partners.',
        success_criteria:
          'At least 3 potential customers express genuine interest in piloting or integrating the API, *and* confirm they have the internal technical capacity/budget to build the necessary UI or integration layer, even with a PDF parsing solution.',
      },
      {
        day: 5,
        task: 'Present several potential pricing models (e.g., per-API call, tiered subscription for X scans/month) to 5-7 target customers (SMBs, ATS integrators) and gauge their willingness to pay.',
        success_criteria:
          'At least 2-3 potential customers confirm willingness to pay a price point that aligns with a viable business model, justifying the development effort and recognizing the value.',
      },
      {
        day: 6,
        task: "Research and identify 2-3 credible sources of large, diverse, and ethically sourced 'role-agnostic' resume/job description datasets or strong partnerships for data acquisition.",
        success_criteria:
          'Identification of viable data sources or partnerships that realistically promise sufficient data volume and diversity to train the model, along with a high-level plan for addressing potential biases within these datasets.',
      },
      {
        day: 7,
        task: 'Review findings and iterate on the core value proposition and MVP feature set based on customer feedback and feasibility findings.',
        success_criteria:
          "A revised PRD draft that explicitly addresses the critical feedback on PDF parsing, 'keyword-heavy' contradictions, 'fit' definition, and a preliminary business model is completed.",
      },
    ],
    pivot_ideas: [
      'Pivot to B2B HR compliance tooling for regulated industries (healthcare, finance).',
      'Bundle resume screening with ATS integrations as a distribution wedge.',
      'Reframe as internal talent mobility matching to reduce hiring risk.',
    ],
    investor_readiness: {
      score: 34,
      verdict: 'NotReady',
      reasons: [
        'Distribution channel is unclear and costly for SMBs.',
        'Differentiation is weak against incumbents.',
        'Core workflow friction (PDF handling) blocks adoption.',
      ],
    },
    reasoning:
      "The SkillMatch AI idea addresses a universally acknowledged and high-pain problem for recruiters: the excessive time spent on manual resume screening and the rigidity/opacity of existing ATS. This fundamental need is a strong foundation. However, the proposed MVP as currently defined is riddled with critical flaws that make it impractical, contradictory, and commercially unviable. The explicit exclusion of PDF parsing is a fatal usability flaw for primary users, directly undermining the core time-saving value proposition. The reliance on basic ML techniques (TF-IDF, Logistic Regression) and 'keyword overlap highlights' fundamentally contradicts the problem statement's criticism of 'keyword-heavy' systems, failing to offer genuine differentiation in a highly saturated market. Crucially, the absence of any defined business model makes it a theoretical exercise rather than a viable product. Furthermore, the subjective definition of 'job fit' and significant challenges in acquiring unbiased training data, coupled with the API-only nature creating adoption barriers for SMBs, underscore the need for a fundamental re-evaluation. While the problem space has immense potential, the current solution requires a substantial 'Pivot' to address these core issues, especially prioritizing essential features like PDF parsing, refining the technical approach for true differentiation, and defining a clear revenue strategy.",
    confidence: 0.9,
  },
  status: 'completed',
  message: 'Verdict available',
}
