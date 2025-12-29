import React, { useMemo } from 'react'
import clsx from 'clsx'
import { useTheme } from 'next-themes'

export type LogoProps = {
  className?: string
  showTagline?: boolean
  /** Force a mode; defaults to auto (uses current theme). */
  mode?: 'auto' | 'light' | 'dark'
}

/**
 * IdeaAudit logo with mark + wordmark. `showTagline` toggles the small subtitle.
 * Theme-aware: adjusts fills and strokes for light/dark backgrounds.
 */
export function Logo({ className, showTagline = false, mode = 'auto' }: LogoProps) {
  const { theme } = useTheme()

  const palette = useMemo(() => {
    const active = mode === 'auto' ? (theme ?? 'light') : mode
    const isDark = active === 'dark'
    return {
      bgRect: isDark ? '#0F172A' : '#F5F3FF',
      strokeRect: isDark ? '#312E81' : '#E0E7FF',
      gradientStart: isDark ? '#C4B5FD' : '#A78BFA',
      gradientEnd: isDark ? '#8B5CF6' : '#6366F1',
      text: isDark ? '#E5E7EB' : '#0F172A',
      tagline: isDark ? '#CBD5F5' : '#64748B',
    }
  }, [mode, theme])

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 160"
      aria-label="IdeaAudit logo"
      className={clsx('block', className)}
    >
      <defs>
        <linearGradient id="ideaAuditGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={palette.gradientStart} />
          <stop offset="100%" stopColor={palette.gradientEnd} />
        </linearGradient>
        <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="12" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g transform="translate(20 20)">
        <rect x="0" y="0" width="120" height="120" rx="28" fill={palette.bgRect} />
        <rect
          x="0"
          y="0"
          width="120"
          height="120"
          rx="28"
          fill="none"
          stroke={palette.strokeRect}
          strokeWidth="2"
        />
        <circle
          cx="60"
          cy="60"
          r="32"
          fill="none"
          stroke="url(#ideaAuditGradient)"
          strokeWidth="4"
          opacity="0.45"
        />
        <circle cx="60" cy="60" r="20" fill="url(#ideaAuditGradient)" filter="url(#softGlow)" />
      </g>

      <text
        x="170"
        y="98"
        fontFamily="Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial"
        fontSize="64"
        fontWeight="700"
        letterSpacing="-1"
        fill={palette.text}
      >
        Idea<tspan fill="url(#ideaAuditGradient)">Audit</tspan>
      </text>

      {showTagline && (
        <text
          x="174"
          y="126"
          fontFamily="Inter, ui-sans-serif, system-ui"
          fontSize="16"
          fill={palette.tagline}
        >
          AI-powered idea validation
        </text>
      )}
    </svg>
  )
}
