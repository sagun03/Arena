'use client'

import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-95',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-blue-600 text-white shadow-sm',
          'hover:bg-blue-700',
          'focus-visible:ring-blue-600',
          'dark:bg-blue-500 dark:hover:bg-blue-600',
        ],
        secondary: [
          'bg-white text-gray-900 shadow-sm border border-gray-300',
          'hover:bg-gray-50',
          'focus-visible:ring-gray-500',
          'dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-700',
        ],
        tertiary: [
          'text-gray-700',
          'hover:text-gray-900 hover:bg-gray-50',
          'focus-visible:ring-gray-500',
        ],
        danger: [
          'bg-red-600 text-white shadow-sm',
          'hover:bg-red-700',
          'focus-visible:ring-red-600',
        ],
        success: [
          'bg-green-600 text-white shadow-sm',
          'hover:bg-green-700',
          'focus-visible:ring-green-600',
        ],
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 py-2',
        lg: 'h-12 px-6 text-base',
        xl: 'h-14 px-8 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
