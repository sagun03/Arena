'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { auth, googleProvider } from '@/lib/firebase'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { ArrowRight } from '@untitledui/icons'
import { useCredits } from '@/app/providers/credits-provider'
import apiClient from '@/lib/api-client'
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  signInWithPopup,
} from 'firebase/auth'

export default function SignupPage() {
  const router = useRouter()
  const { setCredits } = useCredits()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const validatePassword = (pwd: string, confirm: string) => {
    if (pwd !== confirm) {
      setPasswordError('Passwords do not match')
      return false
    }
    if (pwd.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return false
    }
    setPasswordError(null)
    return true
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validatePassword(password, confirmPassword)) return
    setLoading(true)
    setError(null)
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(cred.user, { displayName: name })
      await sendEmailVerification(cred.user)
      setToast({
        type: 'success',
        message: 'Account created! Check email to verify. Redirecting...',
      })
      setTimeout(() => router.push('/auth/login'), 1500)
    } catch (err: any) {
      setError(err.message)
      setToast({ type: 'error', message: err.message || 'Signup failed' })
    } finally {
      setLoading(false)
    }
  }

  const onGoogle = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const idToken = await result.user.getIdToken()
      const { data } = await apiClient.post('/auth/google', { idToken })
      localStorage.setItem('idToken', data.idToken)
      localStorage.setItem('sessionToken', data.sessionToken)
      if (typeof data?.profile?.credits === 'number') {
        setCredits(data.profile.credits)
      }
      setToast({ type: 'success', message: 'Google signup successful! Redirecting...' })
      setTimeout(() => router.push('/'), 500)
    } catch (err: any) {
      setError(err.message)
      setToast({ type: 'error', message: err.message || 'Google signup failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl px-4 py-2 shadow-lg border ${toast.type === 'success' ? 'bg-green-600 text-white border-green-500' : 'bg-red-600 text-white border-red-500'}`}
        >
          {toast.message}
        </div>
      )}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            {/* Brand/Logo */}
            <div className="flex items-center space-x-3">
              <Logo className="h-12 w-auto" />
            </div>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md" variant="elevated">
          <CardHeader className="space-y-2">
            <CardTitle className="text-3xl">Get Started</CardTitle>
            <CardDescription>Create an account to start validating your ideas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Signup Form */}
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                >
                  Full Name
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                >
                  Email
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
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                >
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">At least 8 characters</p>
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="confirm"
                  className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                >
                  Confirm Password
                </label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              {(error || passwordError) && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 p-3">
                  <p className="text-sm text-red-800 dark:text-red-200">{error || passwordError}</p>
                </div>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white"
              >
                {loading ? 'Creating account...' : 'Create Account'}
                {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  Or sign up with
                </span>
              </div>
            </div>

            {/* Google OAuth */}
            <Button
              onClick={onGoogle}
              disabled={loading}
              className="w-full bg-gradient-to-r from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)] text-white"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </Button>

            {/* Link to Login */}
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link
                href="/auth/login"
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
