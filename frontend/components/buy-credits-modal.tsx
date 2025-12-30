'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/button'

interface BuyCreditsModalProps {
  open: boolean
  onClose: () => void
}

export function BuyCreditsModal({ open, onClose }: BuyCreditsModalProps) {
  const router = useRouter()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-gray-900 p-6 shadow-2xl">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Out of credits</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          You have 0 credits left. Purchase a credit pack to start a new validation.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Button
            onClick={() => {
              onClose()
              router.push('/pricing')
            }}
          >
            View credit packs
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Not now
          </Button>
        </div>
      </div>
    </div>
  )
}
