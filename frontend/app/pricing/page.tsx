'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/button'
import { Badge } from '@/components/badge'
import { Card, CardContent } from '@/components/card'
import { useAuth } from '@/app/providers/auth-provider'
import { useCredits } from '@/app/providers/credits-provider'
import { CREDIT_PACKS, createCheckoutSession, CreditPackId } from '@/lib/billing-service'
import { toast } from 'sonner'

export default function PricingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { credits, refreshCredits } = useCredits()
  const [loadingPack, setLoadingPack] = useState<CreditPackId | null>(null)

  const handlePurchase = async (packId: CreditPackId) => {
    if (!user) {
      router.push(`/auth/login?redirect=/pricing`)
      return
    }
    try {
      setLoadingPack(packId)
      const url = await createCheckoutSession(packId)
      window.location.href = url
    } catch (err: any) {
      const message = err?.response?.data?.detail || err?.message || 'Failed to start checkout'
      toast.error(message)
    } finally {
      setLoadingPack(null)
    }
  }

  return (
    <AppShell>
      <div className="space-y-10">
        <div className="flex flex-col gap-3">
          <Badge
            variant="secondary"
            className="w-fit border-0 bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white shadow-sm"
          >
            Credit Packs
          </Badge>
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight">Buy credits</h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl">
              Each validation costs 1 credit. Grab a pack and keep shipping.
            </p>
            {user && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Current balance:{' '}
                <span className="font-semibold text-slate-900 dark:text-white">{credits ?? 0}</span>{' '}
                credits
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {CREDIT_PACKS.map(pack => (
            <Card key={pack.id} className="shadow-xl">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold">{pack.name}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{pack.description}</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black">${pack.price}</span>
                  <span className="text-xs uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    CAD
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {pack.credits} credits
                  </span>
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white"
                  onClick={() => handlePurchase(pack.id)}
                  disabled={loadingPack === pack.id}
                >
                  {loadingPack === pack.id ? 'Redirecting...' : 'Buy credits'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {user && (
          <div className="flex justify-center">
            <Button variant="secondary" onClick={refreshCredits}>
              Refresh balance
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
