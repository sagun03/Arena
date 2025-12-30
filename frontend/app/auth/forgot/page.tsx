'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { ArrowRight, CheckCircle, ArrowLeft } from '@untitledui/icons'
import { auth } from '@/lib/firebase'
import { sendPasswordResetEmail } from 'firebase/auth'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await sendPasswordResetEmail(auth, email)
      setSent(true)
      toast.success('Password reset email sent!')
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <div className="flex items-center space-x-3">
              <Logo className="h-12 w-auto" />
            </div>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md" variant="elevated">
          {sent ? (
            <>
              <CardHeader className="space-y-4 text-center">
                <div className="flex justify-center">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
                <CardTitle className="text-3xl">Check Your Email</CardTitle>
                <CardDescription>We've sent a password reset link to {email}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    The link will expire in 24 hours. If you don't see the email, check your spam
                    folder.
                  </p>
                </div>
                <Button asChild className="w-full" variant="secondary">
                  <Link href="/auth/login">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Sign In
                  </Link>
                </Button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="space-y-2">
                <CardTitle className="text-3xl">Reset Password</CardTitle>
                <CardDescription>
                  Enter your email address and we'll send you a link to reset your password
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                    >
                      Email Address
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  {error && (
                    <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 p-3">
                      <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                    </div>
                  )}
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? 'Sending...' : 'Send Reset Link'}
                    {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
                  </Button>
                </form>
                <Button asChild variant="secondary" className="w-full">
                  <Link href="/auth/login">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Sign In
                  </Link>
                </Button>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
