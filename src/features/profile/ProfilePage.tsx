import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  CheckCircle2,
  Database,
  Edit3,
  Fingerprint,
  GitCompare,
  LogOut,
  Mail,
  MapPin,
  Save,
  ShieldCheck,
  User,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { AlertBanner, MetricCard, PrimaryButton, SecondaryButton, SectionHeader } from '@/components/shared'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authApi } from '@/features/auth/api'
import { useInspectionHistory } from '@/features/inspections/hooks'
import { profileData } from '@/lib/demo-data'
import { useAuthStore } from '@/stores/authStore'

export function ProfilePage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const logout = useAuthStore((s) => s.logout)
  const historyQuery = useInspectionHistory()

  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(user?.name || '')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const displayName = user?.name || 'Authorized Officer'
  const displayRole = user?.role === 'OFFICER' ? 'APMC Procurement Officer' : 'Authorized Mandi Inspector'
  const displayEmail = user?.email || 'officer@onivis.agri'
  const displayCentre = user?.centre || profileData.centre

  const inspections = historyQuery.data ?? []
  const totalAudits = inspections.length
  const certificatesCount = inspections.filter((i) => Boolean(i.certificateId)).length
  const gradeACount = inspections.filter((i) => i.grade?.toLowerCase() === 'grade a').length
  const gradeARate = totalAudits > 0 ? Math.round((gradeACount / totalAudits) * 100) : 0

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = editName.trim()
    if (!trimmed) return
    setIsSaving(true)
    setSaveError(null)
    try {
      const res = await authApi.updateProfile({ name: trimmed })
      updateProfile({ name: res.name || trimmed })
      setSaveSuccess(true)
      setIsEditing(false)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <main className="flex flex-1 flex-col gap-5 px-4 py-4 pt-5">
        {/* User Card */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                <User className="size-7 text-primary" aria-hidden />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">{displayName}</h1>
                <p className="text-xs font-semibold text-primary">{displayRole}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="size-3" aria-hidden />
                  {displayEmail}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="size-3" aria-hidden />
                  {displayCentre}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditName(user?.name || '')
                setIsEditing(true)
              }}
              className="flex items-center gap-1 rounded-lg border border-border bg-surface-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Edit3 className="size-3" />
              Edit
            </button>
          </div>

          <div className="mt-3.5 flex items-center gap-2 border-t border-border/80 pt-3 text-[11px] text-muted-foreground">
            <span className="size-2 rounded-full bg-success" />
            <span>Account Status: Active Authorized Inspector</span>
          </div>
        </div>

        {saveSuccess ? (
          <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 p-3 text-xs text-success">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>Profile updated and saved to local database successfully.</span>
          </div>
        ) : null}

        {/* Real User Inspection KPIs */}
        <div className="grid grid-cols-3 gap-2">
          <MetricCard
            label="Total Audits"
            value={totalAudits}
          />
          <MetricCard
            label="Certificates"
            value={certificatesCount}
          />
          <MetricCard
            label="Grade A Rate"
            value={gradeARate}
            suffix="%"
          />
        </div>

        {/* Advanced Field Tools */}
        <section className="space-y-2">
          <SectionHeader title="Inspection Tools" />
          <div className="space-y-2">
            <ToolRow
              icon={Fingerprint}
              label="Batch Quality Fingerprint"
              onClick={() => navigate('/inspections')}
            />
            <ToolRow
              icon={GitCompare}
              label="Dispute Comparison Tool"
              onClick={() => navigate('/verify')}
            />
            <ToolRow
              icon={ShieldCheck}
              label="Public Certificate Verification"
              onClick={() => navigate('/verify')}
            />
          </div>
        </section>

        {/* System Information */}
        <section className="space-y-2">
          <SectionHeader title="System Architecture" />
          <div className="rounded-xl border border-border bg-card shadow-soft">
            <InfoRow label="Application" value="ONIVIS v1.0.0 (Local MVP)" />
            <InfoRow label="AI Models" value="YOLOv8 Detection + Classification" />
            <InfoRow label="Database" value="Local SQLite + Encrypted Session" />
            <InfoRow label="Status" value="Verified Local Mode (Port 8000)" />
          </div>
        </section>

        <AlertBanner variant="info" title="Important notice">
          ONIVIS is an AI-assisted visual inspection tool. It supports but does
          not replace authorized human inspection decisions or laboratory testing for parameters that
          cannot be assessed from camera images alone.
        </AlertBanner>

        <button
          type="button"
          onClick={() => {
            logout()
            navigate('/welcome')
          }}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 text-sm font-semibold text-destructive hover:bg-destructive/10 transition-colors shadow-soft"
        >
          <LogOut className="size-4" aria-hidden />
          Sign Out of Officer Portal
        </button>
      </main>

      {/* Edit Profile Modal */}
      {isEditing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                <Edit3 className="size-4 text-primary" />
                <span>Edit Officer Profile</span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                aria-label="Close dialog"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="officer-name">Full Officer Name</Label>
                <Input
                  id="officer-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Inspector Ramesh K."
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="officer-email">Email Address</Label>
                <Input
                  id="officer-email"
                  value={displayEmail}
                  disabled
                  className="opacity-70 cursor-not-allowed"
                />
                <p className="text-[10px] text-muted-foreground">
                  Login identity is tied to your account credentials.
                </p>
              </div>

              {saveError ? (
                <p className="text-xs text-destructive">{saveError}</p>
              ) : null}

              <div className="flex gap-2 pt-2 border-t border-border">
                <SecondaryButton
                  className="flex-1 text-xs"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </SecondaryButton>
                <PrimaryButton
                  type="submit"
                  disabled={isSaving || !editName.trim()}
                  className="flex-1 text-xs gap-1.5"
                >
                  <Save className="size-3.5" />
                  {isSaving ? 'Saving…' : 'Save Changes'}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}

function ToolRow({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon
  label: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full min-h-11 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-medium shadow-soft transition-colors hover:bg-surface-muted"
    >
      <Icon className="size-4 text-primary" aria-hidden />
      {label}
    </button>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border px-4 py-3 text-sm last:border-0">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Database className="size-3.5" aria-hidden />
        {label}
      </span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}
