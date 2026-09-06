import type { LucideIcon } from 'lucide-react'
import {
  Database,
  Fingerprint,
  GitCompare,
  LogOut,
  Mail,
  MapPin,
  Settings,
  User,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { AlertBanner, MetricCard, SectionHeader } from '@/components/shared'
import { profileData } from '@/lib/demo-data'
import { useAuthStore } from '@/stores/authStore'

export function ProfilePage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const displayName = user?.name || profileData.name
  const displayRole = user?.role === 'OFFICER' ? 'APMC Procurement Officer' : 'Authorized Mandi Inspector'
  const displayEmail = user?.email || 'officer@apmc.gov.in'

  return (
    <>
      <main className="flex flex-1 flex-col gap-5 px-4 py-4 pt-5">
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-soft">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
            <User className="size-7 text-primary" aria-hidden />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">{displayName}</h1>
            <p className="text-sm text-muted-foreground">{displayRole}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="size-3" aria-hidden />
              {displayEmail}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" aria-hidden />
              {profileData.centre}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <MetricCard
            label="This Month"
            value={profileData.monthlyInspections}
          />
          <MetricCard
            label="Avg. Grade A"
            value={profileData.averageGradeA}
            suffix="%"
          />
          <MetricCard
            label="AI Accuracy"
            value={profileData.aiAccuracy}
            suffix="%"
          />
        </div>

        <section className="space-y-2">
          <SectionHeader title="Advanced Tools" />
          <div className="space-y-2">
            <ToolRow icon={Fingerprint} label="Batch Fingerprint" />
            <ToolRow icon={GitCompare} label="Dispute Comparison" />
            <ToolRow icon={MapPin} label="Centre Analytics" />
          </div>
        </section>

        <section className="space-y-2">
          <SectionHeader title="System Information" />
          <div className="rounded-xl border border-border bg-card shadow-soft">
            <InfoRow label="App Version" value={profileData.appVersion} />
            <InfoRow label="AI Model" value={profileData.aiModel} />
            <InfoRow
              label="Specification Database"
              value={profileData.specificationDatabase}
            />
            <InfoRow
              label="Last Sync"
              value={new Date(profileData.lastSync).toLocaleString('en-IN')}
            />
            <InfoRow label="Offline Data" value={profileData.offlineData} />
          </div>
        </section>

        <AlertBanner variant="info" title="Important notice">
          ONIVIS is an AI-assisted visual inspection tool. It supports but does
          not replace human inspection or laboratory testing for parameters that
          cannot be assessed from camera images alone.
        </AlertBanner>

        <button
          type="button"
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-medium text-muted-foreground shadow-soft"
        >
          <Settings className="size-4" aria-hidden />
          Settings
        </button>

        <button
          type="button"
          onClick={() => {
            logout()
            navigate('/welcome')
          }}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors shadow-soft"
        >
          <LogOut className="size-4" aria-hidden />
          Sign Out of Mandi Portal
        </button>
      </main>
    </>
  )
}

function ToolRow({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <button
      type="button"
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
