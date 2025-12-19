'use client'

import * as React from 'react'
import { Sun, Moon01 } from '@untitledui/icons'
import { useTheme } from 'next-themes'

import { Button } from '@/components/button'

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="secondary" size="sm" className="w-10 h-10 p-0">
        <div className="w-5 h-5" />
      </Button>
    )
  }

  const isDark = theme === 'dark'

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="w-10 h-10 p-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <Sun
        className={`h-5 w-5 transition-all duration-300 ${isDark ? 'rotate-90 scale-0' : 'rotate-0 scale-100'}`}
      />
      <Moon01
        className={`absolute h-5 w-5 transition-all duration-300 ${isDark ? 'rotate-0 scale-100' : '-rotate-90 scale-0'}`}
      />
    </Button>
  )
}
