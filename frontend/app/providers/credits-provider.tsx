'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from './auth-provider'
import { getCredits } from '@/lib/billing-service'

interface CreditsContextType {
  credits: number | null
  loading: boolean
  refreshCredits: () => Promise<void>
  setCredits: (value: number | null) => void
}

const CreditsContext = createContext<CreditsContextType | undefined>(undefined)

export function CreditsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const pathname = usePathname()
  const [credits, setCredits] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const refreshCredits = useCallback(async () => {
    if (!user || pathname?.startsWith('/auth')) {
      setCredits(null)
      return
    }
    try {
      setLoading(true)
      const balance = await getCredits()
      setCredits(balance)
    } catch (error) {
      console.error('Failed to load credits', error)
    } finally {
      setLoading(false)
    }
  }, [user, pathname])

  useEffect(() => {
    if (!user || pathname?.startsWith('/auth')) {
      setCredits(null)
      return
    }
    refreshCredits()
  }, [user, pathname, refreshCredits])

  return (
    <CreditsContext.Provider value={{ credits, loading, refreshCredits, setCredits }}>
      {children}
    </CreditsContext.Provider>
  )
}

export function useCredits() {
  const context = useContext(CreditsContext)
  if (!context) {
    throw new Error('useCredits must be used within a CreditsProvider')
  }
  return context
}
