import apiClient from './api-client'

export type CreditPackId = 'starter' | 'plus' | 'pro'

export interface CreditPack {
  id: CreditPackId
  name: string
  price: number
  credits: number
  description: string
}

export const CREDIT_PACKS: CreditPack[] = [
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
