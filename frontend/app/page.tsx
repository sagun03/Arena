'use client'

import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card'
import { Badge } from '@/components/badge'
import { Section, Container } from '@/components/section'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  CheckCircle,
  Target01,
  Zap,
  Users01,
  TrendUp01,
  Database01,
  MessageTextCircle01,
  FileShield01,
  ArrowRight,
  PlayCircle,
} from '@untitledui/icons'

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-50">
        <Container className="flex items-center justify-between py-4">
          {/* Brand/Logo */}
          <div className="flex items-center space-x-3">
            <div className="relative w-8 h-8 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400/40 to-indigo-400/40 rounded-lg blur-sm"></div>
              <div className="relative w-5 h-5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full"></div>
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">ARENA</span>
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
            <a
              href="#testimonials"
              className="group flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Resources
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
              href="#about"
              className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              About
            </a>
          </div>

          {/* Action Buttons */}
          <div className="hidden lg:flex items-center space-x-4">
            <ThemeToggle />
            <Button
              variant="secondary"
              size="sm"
              className="px-4 py-2 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg"
            >
              Log in
            </Button>
            <Button
              size="sm"
              className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-0 shadow-sm hover:shadow-md rounded-lg"
            >
              Sign up
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center space-x-2">
            <ThemeToggle />
            <Button variant="secondary" size="sm" className="px-3 py-2 text-sm">
              Menu
            </Button>
          </div>
        </Container>
      </nav>

      {/* Hero Section */}
      <Section className="pt-32 pb-16 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
        <Container size="lg" className="text-center">
          <Badge
            variant="secondary"
            className="mb-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            🚀 The Future of Idea Validation
          </Badge>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-gray-900 dark:text-white mb-6">
            Stop Wasting Time on{' '}
            <span className="bg-gradient-to-r from-red-500 to-purple-600 bg-clip-text text-transparent">
              Bad Ideas
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            ARENA is an agentic system that disagree by default and validates ideas through
            structured adversarial reasoning. Get clear verdicts: Proceed, Pivot, Kill, or Needs
            More Data.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" className="text-lg px-8 py-4">
              Try ARENA Free →
            </Button>
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
              <span>5 Free Validations</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Instant Results</span>
            </div>
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
              Why Founders Choose ARENA
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Built for the harsh reality of entrepreneurship. ARENA doesn't encourage—it validates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
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

            <Card className="group relative border-0 shadow-lg hover:shadow-2xl dark:shadow-slate-800/50 transition-all duration-300 bg-white dark:bg-slate-800 hover:scale-[1.02] hover:-translate-y-1">
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

            <Card className="group relative border-0 shadow-lg hover:shadow-2xl dark:shadow-slate-800/50 transition-all duration-300 bg-white dark:bg-slate-800 hover:scale-[1.02] hover:-translate-y-1">
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

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <TrendUp01 className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>7-Day Test Plan</CardTitle>
                <CardDescription>
                  Get actionable validation experiments based on identified assumptions and risks.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-yellow-600" />
                </div>
                <CardTitle>Instant Results</CardTitle>
                <CardDescription>
                  Upload your idea, get a comprehensive analysis in under 2 minutes. No waiting.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <MessageTextCircle01 className="w-6 h-6 text-indigo-600" />
                </div>
                <CardTitle>Debate Transcript</CardTitle>
                <CardDescription>
                  View the full agent debate transcript. Understand exactly why your idea passed or
                  failed.
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
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
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
      <Section className="bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-24">
        <Container size="lg">
          <div className="text-center mb-16">
            <div className="inline-flex items-center rounded-full bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 px-4 py-2 mb-6">
              <span className="text-sm font-semibold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                🎯 Try It Now
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              See ARENA in{' '}
              <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                Action
              </span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
              Upload your business idea and get a real validation in seconds.
            </p>
          </div>

          <Card className="max-w-4xl mx-auto shadow-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-2xl">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                🚀 Validate Your Idea
              </CardTitle>
              <CardDescription className="text-lg text-gray-600 dark:text-gray-300">
                Enter your business idea details below and see how ARENA evaluates it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 px-8 pb-8">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  📝 Business Idea Description
                </label>
                <Input
                  placeholder="Describe your startup idea in 2-3 sentences..."
                  className="w-full h-12 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    👥 Target Customer
                  </label>
                  <Input
                    placeholder="Who is your customer?"
                    className="w-full h-12 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    🌍 Market Size
                  </label>
                  <Input
                    placeholder="Market geography/industry"
                    className="w-full h-12 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <Button className="group px-12 py-4 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 rounded-xl">
                  <span className="mr-3">✨</span>
                  Validate My Idea
                  <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>

              <div className="text-center pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  🔒 <strong>Free & Secure:</strong> No credit card required • 5 free validations •
                  Instant results
                </p>
              </div>
            </CardContent>
          </Card>
        </Container>
      </Section>

      {/* Sample Output */}
      <Section variant="light" className="bg-white dark:bg-gray-900">
        <Container>
          <div className="text-center mb-16">
            <Badge variant="destructive" className="mb-4">
              Sample Output
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              What You Get Back
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Comprehensive analysis with clear next steps.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <Card className="shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gray-900 dark:text-white">Verdict & Score</CardTitle>
                  <Badge variant="destructive" size="lg">
                    Kill
                  </Badge>
                </div>
                <div className="text-4xl font-bold text-red-600">32/100</div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">
                  Your idea shows promise but faces significant market and execution challenges.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Top Kill-Shots</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Market already saturated with established competitors
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Customer acquisition cost exceeds lifetime value
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    No clear differentiation from existing solutions
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <div className="inline-flex items-center space-x-2 bg-white px-6 py-3 rounded-lg border border-gray-200">
              <Badge variant="success">Verified</Badge>
              <Badge variant="warning">Assumption</Badge>
              <Badge variant="secondary">Needs Validation</Badge>
              <span className="text-sm text-gray-600 ml-2">Every claim is tagged</span>
            </div>
          </div>
        </Container>
      </Section>

      {/* Testimonials */}
      <Section className="bg-gray-50 dark:bg-gray-800">
        <Container>
          <div className="text-center mb-16">
            <Badge variant="brand" className="mb-4">
              Testimonials
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              What Founders Say
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Real feedback from real entrepreneurs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                quote:
                  'ARENA saved me 6 months of development time by killing my idea before I built it. The kill-shots were spot-on.',
                author: 'Sarah Chen',
                role: 'Founder, TechFlow',
                rating: 5,
              },
              {
                quote:
                  "Finally, an idea validator that tells you the truth. No more 'that sounds interesting' - just clear verdicts.",
                author: 'Marcus Rodriguez',
                role: 'CEO, DataSync',
                rating: 5,
              },
              {
                quote:
                  'The 7-day test plan was worth the price alone. Gave me exactly what to validate next.',
                author: 'Emma Thompson',
                role: 'Founder, HealthTech Solutions',
                rating: 5,
              },
            ].map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <span key={i} className="text-yellow-400">
                        ⭐
                      </span>
                    ))}
                  </div>
                  <blockquote className="text-gray-600 mb-4">"{testimonial.quote}"</blockquote>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.author}</div>
                    <div className="text-sm text-gray-500">{testimonial.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
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
              Start free, pay only for serious validation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="text-center text-gray-900 dark:text-white">Free</CardTitle>
                <div className="text-center">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">$0</span>
                  <span className="text-gray-500 dark:text-gray-400">/month</span>
                </div>
                <CardDescription className="text-center text-gray-600 dark:text-gray-300">
                  Perfect for exploring ideas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    5 free validations
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Basic verdict & score
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Evidence tagging</span>
                </div>
                <Button variant="secondary" className="w-full mt-6">
                  Get Started Free
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-500 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge variant="brand">Most Popular</Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-center">Pro</CardTitle>
                <div className="text-center">
                  <span className="text-4xl font-bold">$29</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <CardDescription className="text-center">For serious founders</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Unlimited validations</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Full debate transcript</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">7-day test plans</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Priority support</span>
                </div>
                <Button className="w-full mt-6">Start Pro Trial →</Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="text-center text-gray-900 dark:text-white">
                  Enterprise
                </CardTitle>
                <div className="text-center">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">Custom</span>
                </div>
                <CardDescription className="text-center text-gray-600 dark:text-gray-300">
                  For teams and organizations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Everything in Pro
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Team collaboration
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Custom integrations
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Dedicated support
                  </span>
                </div>
                <Button variant="secondary" className="w-full mt-6">
                  Contact Sales
                </Button>
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>

      {/* CTA Section */}
      <Section className="bg-gradient-to-r from-red-500 to-purple-600 text-white">
        <Container size="lg" className="text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to Validate Your Next Big Idea?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join thousands of founders who use ARENA to make better decisions. Start free, no credit
            card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-gray-900 hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
            >
              Start Free Trial →
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="border-white text-white hover:bg-white hover:text-gray-900 dark:border-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
            >
              Schedule Demo
            </Button>
          </div>
          <p className="text-sm mt-6 opacity-75">
            ⚡ 5 free validations • No setup required • Cancel anytime
          </p>
        </Container>
      </Section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-purple-600 rounded-lg flex items-center justify-center text-xl">
                  🎯
                </div>
                <span className="text-xl font-bold">ARENA</span>
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
            <p>&copy; 2024 ARENA. All rights reserved. Built with ❤️ for founders.</p>
          </div>
        </Container>
      </footer>
    </div>
  )
}
