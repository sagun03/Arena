import apiClient from './api-client'

export type CreditPackId = 'starter' | 'plus' | 'pro'

export interface CreditPack {
  id: CreditPackId
  name: string
  price: number
  credits: number
  description: string
}

export interface PricingConfig {
  currencyCode: 'CAD' | 'INR'
  currencySymbol: '$' | 'Rs'
  packs: CreditPack[]
}

const PACKS_CAD: CreditPack[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 5,
    credits: 10,
    description: 'Best for quick idea checks',
  },
  {
    id: 'plus',
    name: 'Plus',
    price: 10,
    credits: 20,
    description: 'For weekly validation sprints',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 20,
    credits: 50,
    description: 'For heavy research cycles',
  },
]

const PACKS_INR: CreditPack[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 20,
    credits: 10,
    description: 'Best for quick idea checks',
  },
  {
    id: 'plus',
    name: 'Plus',
    price: 30,
    credits: 20,
    description: 'For weekly validation sprints',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 50,
    credits: 50,
    description: 'For heavy research cycles',
  },
]

export function getLocaleRegion(): string | null {
  if (typeof window === 'undefined') return null
  const locale = navigator.languages?.[0] || navigator.language
  if (!locale) return null
  const parts = locale.split('-')
  const region = parts[1]?.toUpperCase() || null
  if (region) return region
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (timeZone && timeZone.toLowerCase().includes('kolkata')) {
      return 'IN'
    }
  } catch {
    return null
  }
  return null
}

export function getPricingConfigForRegion(region: string | null): PricingConfig {
  if (region === 'IN') {
    return {
      currencyCode: 'INR',
      currencySymbol: 'Rs',
      packs: PACKS_INR,
    }
  }
  return {
    currencyCode: 'CAD',
    currencySymbol: '$',
    packs: PACKS_CAD,
  }
}

export async function createCheckoutSession(
  packId: CreditPackId,
  region?: string | null
): Promise<string> {
  const { data } = await apiClient.post<{ url: string }>('/billing/checkout-session', {
    pack_id: packId,
    region: region ?? null,
  })
  return data.url
}

export async function getCredits(): Promise<number> {
  const { data } = await apiClient.get<{ credits: number }>('/billing/credits')
  return data.credits
}
