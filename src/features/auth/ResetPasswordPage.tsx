import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, KeyRound, Lock } from 'lucide-react'

import { PrimaryButton } from '@/components/shared/PrimaryButton'
import { authApi } from './api'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!token || !newPassword) {
      setError('Please provide the reset token and your new password.')
      return
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.')
      return
    }

    setLoading(true)
    try {
      await authApi.resetPassword({ token, newPassword })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err: any) {
      setError(err?.message || 'Invalid or expired reset token.')
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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Set New Password</h1>
          <p className="text-xs text-slate-500 mt-1">Enter your token and desired password</p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-200 text-xs text-emerald-800 space-y-2 text-center">
            <CheckCircle2 className="size-6 text-emerald-600 mx-auto" />
            <p className="font-semibold text-emerald-900">Password Updated Successfully!</p>
            <p>Redirecting to login portal...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reset Token</label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="e.g. rst-a1b2c3d4"
                className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <PrimaryButton type="submit" fullWidth disabled={loading}>
              {loading ? 'Updating Password...' : 'Save New Password'}
            </PrimaryButton>
          </form>
        )}
      </div>
    </div>
  )
}
