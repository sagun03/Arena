import apiClient from './api-client'

export type CreditPackId = 'starter' | 'pro_monthly' | 'growth_monthly' | 'scale_monthly'

export interface CreditPack {
  id: CreditPackId
  name: string
  price: number
  credits: number
  description: string
  billing: 'one-time' | 'monthly'
}

export interface PricingConfig {
  currencyCode: 'USD'
  currencySymbol: '$'
  packs: CreditPack[]
}

export interface BillingStatus {
  subscribed: boolean
  subscriptionPackId?: CreditPackId | null
}

const PACKS_USD: CreditPack[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 5,
    credits: 12,
    description: 'Best for quick idea checks',
    billing: 'one-time',
  },
  {
    id: 'pro_monthly',
    name: 'Pro',
    price: 15,
    credits: 50,
    description: 'Monthly credits for steady validation',
    billing: 'monthly',
  },
  {
    id: 'growth_monthly',
    name: 'Growth',
    price: 25,
    credits: 100,
    description: 'Built for fast weekly shipping',
    billing: 'monthly',
  },
  {
    id: 'scale_monthly',
    name: 'Scale',
    price: 50,
    credits: 250,
    description: 'For teams running heavy cycles',
    billing: 'monthly',
  },
]

export function getPricingConfig(): PricingConfig {
  return {
    currencyCode: 'USD',
    currencySymbol: '$',
    packs: PACKS_USD,
  }
}

export async function createCheckoutSession(packId: CreditPackId): Promise<string> {
  const { data } = await apiClient.post<{ url: string }>('/billing/checkout-session', {
    pack_id: packId,
  })
  return data.url
}

export async function getCredits(): Promise<number> {
  const { data } = await apiClient.get<{ credits: number }>('/billing/credits')
  return data.credits
}

export async function getBillingStatus(): Promise<BillingStatus> {
  const { data } = await apiClient.get<{
    subscribed: boolean
    subscription_pack_id?: CreditPackId | null
  }>('/billing/status')
  return {
    subscribed: data.subscribed,
    subscriptionPackId: data.subscription_pack_id ?? null,
  }
}

export async function createPortalSession(): Promise<string> {
  const { data } = await apiClient.post<{ url: string }>('/billing/portal-session')
  return data.url
}
