'use client'

import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  [
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
    'transition-colors',
  ],
  {
    variants: {
      variant: {
        default:
          'bg-gray-900 dark:bg-gray-100 text-gray-50 dark:text-gray-900 hover:bg-gray-900/80 dark:hover:bg-gray-100/80',
        secondary:
          'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-100/80 dark:hover:bg-gray-800/80',
        destructive: 'bg-red-500 text-gray-50 hover:bg-red-500/80',
        success: 'bg-green-500 text-gray-50 hover:bg-green-500/80',
        warning: 'bg-yellow-500 text-gray-50 hover:bg-yellow-500/80',
        brand: 'bg-blue-600 text-white hover:bg-blue-600/80',
        outline:
          'text-gray-950 dark:text-gray-50 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, ...props }, ref) => (
    <div ref={ref} className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
)
Badge.displayName = 'Badge'

export { Badge, badgeVariants }
