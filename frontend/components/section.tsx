import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const sectionVariants = cva('py-24 sm:py-32', {
  variants: {
    variant: {
      default: '',
      dark: 'bg-gray-900 text-white',
      light: 'bg-gray-50',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

const containerVariants = cva('mx-auto max-w-7xl px-6 lg:px-8', {
  variants: {
    size: {
      default: '',
      sm: 'max-w-3xl',
      lg: 'max-w-5xl',
    },
  },
  defaultVariants: {
    size: 'default',
  },
})

export interface SectionProps
  extends React.HTMLAttributes<HTMLElement>, VariantProps<typeof sectionVariants> {}

export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof containerVariants> {}

export function Section({ className, variant, ...props }: SectionProps) {
  return <section className={cn(sectionVariants({ variant }), className)} {...props} />
}

export function Container({ className, size, ...props }: ContainerProps) {
  return <div className={cn(containerVariants({ size }), className)} {...props} />
}
