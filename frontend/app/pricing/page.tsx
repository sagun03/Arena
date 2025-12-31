'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/button'
import { Badge } from '@/components/badge'
import { Card, CardContent } from '@/components/card'
import { useAuth } from '@/app/providers/auth-provider'
import { useCredits } from '@/app/providers/credits-provider'
import {
  createCheckoutSession,
  createPortalSession,
  CreditPackId,
  getBillingStatus,
  getPricingConfig,
} from '@/lib/billing-service'
import { toast } from 'sonner'

export default function PricingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { credits, refreshCredits } = useCredits()
  const [loadingPack, setLoadingPack] = useState<CreditPackId | null>(null)
  const [billingStatus, setBillingStatus] = useState<{
    subscribed: boolean
    subscriptionPackId: CreditPackId | null
  } | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [managing, setManaging] = useState(false)
  const { packs, currencyCode, currencySymbol } = getPricingConfig()
  const packMap = useMemo(() => new Map(packs.map(pack => [pack.id, pack])), [packs])
  const subscriptionPack = billingStatus?.subscriptionPackId
    ? packMap.get(billingStatus.subscriptionPackId)
    : null
  const showSkeletons = loadingStatus
  const visiblePacks = billingStatus?.subscribed
    ? packs.filter(pack => pack.id === 'starter')
    : packs

  useEffect(() => {
    if (!user) {
      setBillingStatus(null)
      setLoadingStatus(false)
      router.replace(`/auth/login?redirect=/pricing`)
      return
    }
    async function loadStatus() {
      try {
        setLoadingStatus(true)
        const status = await getBillingStatus()
        setBillingStatus({
          subscribed: status.subscribed,
          subscriptionPackId: status.subscriptionPackId ?? null,
        })
      } catch (err: any) {
        const message = err?.response?.data?.detail || err?.message
        if (message) {
          console.warn('Failed to load billing status', message)
        }
        setBillingStatus(null)
      } finally {
        setLoadingStatus(false)
      }
    }
    loadStatus()
  }, [user])

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

  const handleManageSubscription = async () => {
    if (!user) {
      router.push(`/auth/login?redirect=/pricing`)
      return
    }
    try {
      setManaging(true)
      const url = await createPortalSession()
      window.location.href = url
    } catch (err: any) {
      const message = err?.response?.data?.detail || err?.message || 'Failed to open portal'
      toast.error(message)
    } finally {
      setManaging(false)
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
              Each validation costs 2 credits. Grab a pack and keep shipping.
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

        {showSkeletons && (
          <Card className="shadow-xl animate-pulse">
            <CardContent className="p-6 space-y-4">
              <div className="h-4 w-24 rounded-full bg-slate-200 dark:bg-slate-800" />
              <div className="h-6 w-1/2 rounded-full bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-2/3 rounded-full bg-slate-200 dark:bg-slate-800" />
              <div className="h-10 w-40 rounded-xl bg-slate-200 dark:bg-slate-800" />
            </CardContent>
          </Card>
        )}
        {user && billingStatus?.subscribed && (
          <Card className="shadow-xl border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/30">
            <CardContent className="p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-sm uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300">
                  Subscribed
                </p>
                <p className="text-xl font-semibold text-slate-900 dark:text-white">
                  {subscriptionPack?.name || 'Monthly plan'} active
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Manage your subscription or keep buying one-time credits below.
                </p>
              </div>
              <Button
                className="bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white"
                onClick={handleManageSubscription}
                disabled={managing || loadingStatus}
              >
                {managing ? 'Opening...' : 'Manage subscription'}
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {showSkeletons
            ? Array.from({ length: 3 }).map((_, index) => (
                <Card key={`pack-skeleton-${index}`} className="shadow-xl animate-pulse">
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-2">
                      <div className="h-6 w-32 rounded-full bg-slate-200 dark:bg-slate-800" />
                      <div className="h-4 w-3/4 rounded-full bg-slate-200 dark:bg-slate-800" />
                    </div>
                    <div className="h-10 w-40 rounded-xl bg-slate-200 dark:bg-slate-800" />
                    <div className="h-10 w-full rounded-xl bg-slate-200 dark:bg-slate-800" />
                  </CardContent>
                </Card>
              ))
            : visiblePacks.map(pack => (
                <Card key={pack.id} className="shadow-xl">
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-2xl font-semibold">{pack.name}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {pack.description}
                      </p>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black">
                        {currencySymbol} {pack.price}
                      </span>
                      <span className="text-xs uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                        {currencyCode}
                      </span>
                      <span className="text-xs uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                        {pack.billing === 'monthly' ? '/mo' : 'one-time'}
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
                      {loadingPack === pack.id
                        ? 'Redirecting...'
                        : pack.billing === 'monthly'
                          ? 'Subscribe'
                          : 'Buy credits'}
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
