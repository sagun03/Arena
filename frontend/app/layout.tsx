import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { RouteProvider } from './providers/route-provider'
import { ThemeProvider } from './providers/theme-provider'
import { AuthProvider } from './providers/auth-provider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'IdeaAudit - Agentic Idea Validation Platform',
  description: 'Disagree by default. Validate ideas through structured adversarial reasoning.',
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} scroll-smooth bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300`}
      suppressHydrationWarning
    >
      <body
        className="antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300"
        suppressHydrationWarning
      >
        <RouteProvider>
          <ThemeProvider>
            <AuthProvider>
              <Toaster richColors position="bottom-center" />
              {children}
            </AuthProvider>
          </ThemeProvider>
        </RouteProvider>
      </body>
    </html>
  )
}
