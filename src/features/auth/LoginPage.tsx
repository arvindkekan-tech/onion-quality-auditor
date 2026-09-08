import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react'

import { PrimaryButton } from '@/components/shared/PrimaryButton'
import { SecondaryButton } from '@/components/shared/SecondaryButton'
import { useAuthStore } from '@/stores/authStore'
import { authApi } from './api'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAuthStore((s) => s.login)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'
  const stateMessage = (location.state as { message?: string })?.message

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email || !password) {
      setError('Please enter both email and password.')
      return
    }

    setLoading(true)
    try {
      const res = await authApi.login({ email, password })
      login(res.accessToken, res.user)
      navigate(from, { replace: true })
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDemoLogin() {
    setError(null)
    setLoading(true)
    const demoEmail = 'inspector.lasalgaon@apmc.gov.in'
    const demoPassword = 'Password@123'

    try {
      // Try login first
      const res = await authApi.login({ email: demoEmail, password: demoPassword })
      login(res.accessToken, res.user)
      navigate(from, { replace: true })
    } catch {
      // If demo user does not exist, sign up automatically
      try {
        const signupRes = await authApi.signup({
          name: 'Inspector Rajesh Patil',
          email: demoEmail,
          password: demoPassword,
          role: 'INSPECTOR',
        })
        login(signupRes.accessToken, signupRes.user)
        navigate(from, { replace: true })
      } catch (err: any) {
        setError(err?.message || 'Unable to log in with demo credentials.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center px-4 py-8 bg-slate-50">
      <div className="mx-auto w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
            <ShieldCheck className="size-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">ONIVIS Inspector Portal</h1>
          <p className="text-xs text-slate-500 mt-1">Government & APMC Mandi Quality Assurance</p>
        </div>

        {stateMessage && !error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-800 border border-blue-200">
            <ShieldCheck className="size-4 shrink-0 mt-0.5 text-blue-600" />
            <span>{stateMessage}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@apmc.gov.in"
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">Password</label>
              <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-10 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <PrimaryButton type="submit" fullWidth disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </PrimaryButton>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-2 text-slate-400">or evaluator quick-access</span>
          </div>
        </div>

        <SecondaryButton type="button" fullWidth onClick={handleDemoLogin} disabled={loading}>
          <ShieldCheck className="mr-2 size-4 text-emerald-600" />
          1-Click Demo Inspector Login
        </SecondaryButton>

        <p className="mt-6 text-center text-xs text-slate-500">
          Need an authorized account?{' '}
          <Link to="/signup" className="font-semibold text-primary hover:underline">
            Register as Inspector
          </Link>
        </p>

        <div className="mt-4 pt-4 border-t border-slate-100 text-center">
          <Link to="/welcome" className="inline-flex items-center text-xs text-slate-400 hover:text-slate-600">
            ← Back to Public Portal
          </Link>
        </div>
      </div>
    </div>
  )
}
