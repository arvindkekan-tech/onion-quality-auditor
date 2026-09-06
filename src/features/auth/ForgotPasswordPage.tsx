import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2, KeyRound, Mail } from 'lucide-react'

import { PrimaryButton } from '@/components/shared/PrimaryButton'
import { authApi } from './api'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email) return

    setLoading(true)
    try {
      await authApi.forgotPassword({ email })
      setSuccess(true)
    } catch (err: any) {
      setError(err?.message || 'Failed to submit password reset request.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center px-4 py-8 bg-slate-50">
      <div className="mx-auto w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-center mb-6">
          <div className="inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
            <KeyRound className="size-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Reset Password</h1>
          <p className="text-xs text-slate-500 mt-1">Enter your registered APMC email address</p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-200 text-xs text-emerald-800 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-emerald-900">
                <CheckCircle2 className="size-4 text-emerald-600" />
                Reset Instructions Dispatched
              </div>
              <p>
                If an account exists for <span className="font-semibold">{email}</span>, a secure password reset token has been registered in the system.
              </p>
            </div>
            <Link to="/reset-password">
              <PrimaryButton fullWidth>Enter Reset Token</PrimaryButton>
            </Link>
          </div>
        ) : (
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

            <PrimaryButton type="submit" fullWidth disabled={loading}>
              {loading ? 'Submitting...' : 'Send Reset Link'}
            </PrimaryButton>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-slate-500">
          Remember your password?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
