'use client'

import { useEffect, useMemo, useState } from 'react'
import apiClient from './api-client'
import { getLocaleRegion, getPricingConfigForRegion, PricingConfig } from './billing-service'

const REGION_STORAGE_KEY = 'ideaaudit_region'

function getStoredRegion(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REGION_STORAGE_KEY)
}

function setStoredRegion(region: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(REGION_STORAGE_KEY, region)
}

export function usePricingConfig(): { config: PricingConfig; region: string | null } {
  const [region, setRegion] = useState<string | null>(() => {
    return getStoredRegion() || getLocaleRegion()
  })

  useEffect(() => {
    let active = true
    async function loadRegion() {
      try {
        const { data } = await apiClient.get<{ country_code?: string | null }>('/billing/region')
        if (!active) return
        if (data?.country_code) {
          setRegion(data.country_code)
          setStoredRegion(data.country_code)
        }
      } catch (error) {
        return
      }
    }
    loadRegion()
    return () => {
      active = false
    }
  }, [])

  const config = useMemo(() => getPricingConfigForRegion(region), [region])
  return { config, region }
}
