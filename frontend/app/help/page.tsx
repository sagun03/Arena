'use client'

import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { Badge } from '@/components/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/card'
import { Button } from '@/components/button'
import { Mail01, MessageDotsCircle, Shield01, Zap } from '@untitledui/icons'

const faqs = [
  {
    question: 'How do credits work?',
    answer: 'Each validation costs 1 credit. Your free account includes 2 credits to get started.',
    icon: Zap,
  },
  {
    question: 'What happens when credits run out?',
    answer: 'You’ll be prompted to buy a credit pack before launching another validation.',
    icon: MessageDotsCircle,
  },
  {
    question: 'Where are my audits stored?',
    answer: 'All completed verdicts live under My Audits and stay available for review.',
    icon: Shield01,
  },
]

export default function HelpPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col gap-3">
          <Badge
            variant="secondary"
            className="w-fit border-0 bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white shadow-sm"
          >
            Help Center
          </Badge>
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight">How can we help?</h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl">
              Quick answers and support options for credits, validations, and billing.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {faqs.map(item => {
            const Icon = item.icon
            return (
              <Card key={item.question} className="shadow-lg">
                <CardHeader className="space-y-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{item.question}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-600 dark:text-slate-300">
                  {item.answer}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Card className="shadow-xl">
          <CardContent className="p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Need a hand from the team?
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                Email us with your question and we’ll get back quickly.
              </p>
            </div>
            <Button
              asChild
              className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white"
            >
              <Link className="flex text-center items-center" href="mailto:sagunsaluja13@gmail.com">
                <Mail01 className="mr-2 h-4 w-4" />
                Contact support
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
