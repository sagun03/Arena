import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { isValidElement } from 'react'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Untitled UI utilities
export function cx(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function sortCx(obj: Record<string, ClassValue>) {
  return obj
}

export function isReactComponent(component: any): component is React.ComponentType<any> {
  return (
    typeof component === 'function' ||
    (typeof component === 'object' && component !== null && 'render' in component)
  )
}
