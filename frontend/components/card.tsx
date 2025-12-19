'use client'

import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const cardVariants = cva(
  [
    'rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm',
    'transition-shadow duration-200',
  ],
  {
    variants: {
      variant: {
        default: 'border-gray-200 dark:border-gray-700',
        elevated: 'border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg',
        outlined: 'border-gray-300 dark:border-gray-600 bg-transparent dark:bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

const cardHeaderVariants = cva('flex flex-col space-y-1.5 p-6')

const cardTitleVariants = cva(
  'text-2xl font-semibold leading-none tracking-tight text-gray-900 dark:text-gray-100'
)

const cardDescriptionVariants = cva('text-sm text-gray-500 dark:text-gray-400')

const cardContentVariants = cva('p-6 pt-0')

const cardFooterVariants = cva('flex items-center p-6 pt-0')

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ variant }), className)} {...props} />
  )
)
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn(cardHeaderVariants(), className)} {...props} />
  )
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLParagraphElement, CardTitleProps>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn(cardTitleVariants(), className)} {...props} />
  )
)
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn(cardDescriptionVariants(), className)} {...props} />
  )
)
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn(cardContentVariants(), className)} {...props} />
  )
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn(cardFooterVariants(), className)} {...props} />
  )
)
CardFooter.displayName = 'CardFooter'

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
  cardHeaderVariants,
  cardTitleVariants,
  cardDescriptionVariants,
  cardContentVariants,
  cardFooterVariants,
}
