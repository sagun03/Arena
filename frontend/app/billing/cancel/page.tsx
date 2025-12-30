'use client'

import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/button'
import { Badge } from '@/components/badge'
import { Card, CardContent } from '@/components/card'
import { AlertTriangle } from '@untitledui/icons'

export default function BillingCancelPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col gap-3">
          <Badge
            variant="secondary"
            className="w-fit border-0 bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white shadow-sm"
          >
            Billing
          </Badge>
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight">Checkout canceled</h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl">
              Your payment was not completed. You can try again anytime.
            </p>
          </div>
        </div>

        <Card className="shadow-xl">
          <CardContent className="p-6 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Ready when you are
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Pick a pack when you want to continue validating ideas.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 w-full sm:w-auto">
              <Button
                asChild
                className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white"
              >
                <Link href="/pricing">Back to pricing</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                Need a hand?
              </h2>
              <p className="mt-2 text-base text-slate-700 dark:text-slate-200">
                You can always return to pricing later and finish checkout.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                Explore audits
              </h2>
              <p className="mt-2 text-base text-slate-700 dark:text-slate-200">
                Review your prior verdicts and plan your next validation.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
