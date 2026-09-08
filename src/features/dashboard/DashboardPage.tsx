import { Link } from 'react-router-dom'
import {
  AlertCircle,
  BarChart3,
  Camera,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  History,
  Layers,
  Plus,
  QrCode,
  TrendingUp,
  User,
} from 'lucide-react'

import { MobileHeader } from '@/components/layout/MobileHeader'
import {
  PrimaryButton,
  SectionHeader,
  StatusBadge,
} from '@/components/shared'
import {
  useInspectionHistory,
  useOfficerReAuditRequests,
} from '@/features/inspections/hooks'
import { ROUTES } from '@/lib/constants'
import { useAuthStore } from '@/stores/authStore'
import type { InspectionHistoryItem } from '@/types/inspection'

function resumeHref(item: InspectionHistoryItem) {
  if (item.certificateId) return `/certificate/${item.certificateId}`
  if (item.status === 'rejected') return `/inspection/${item.id}/results`
  if (item.reviewSubmitted) return `/inspection/${item.id}/review`
  if (item.analysisStatus === 'completed') {
    return `/inspection/${item.id}/results`
  }
  if (item.analysisStatus === 'pending' || item.analysisStatus === 'processing') {
    return `/inspection/${item.id}/analysis?resume=true`
  }
  if (item.imageId) {
    return `/inspection/${item.id}/quality?imageId=${encodeURIComponent(item.imageId)}`
  }
  return `/inspection/${item.id}/capture`
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const historyQuery = useInspectionHistory()
  const inspections = historyQuery.data ?? []

  const officerName = user?.name || 'Officer'
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const completed = inspections.filter(
    (item) =>
      item.analysisStatus === 'completed' ||
      item.status === 'completed' ||
      item.status === 'reviewed',
  )
  const pendingReviews = inspections.filter(
    (item) =>
      item.analysisStatus === 'completed' &&
      !item.reviewSubmitted &&
      !item.certificateId &&
      item.status !== 'rejected',
  )
  const certificatesCount = inspections.filter((item) =>
    Boolean(item.certificateId),
  ).length

  const reAuditsQuery = useOfficerReAuditRequests()
  const reAuditRequests = reAuditsQuery.data ?? []
  const pendingReAuditsCount = reAuditRequests.filter(
    (req) => req.status?.toUpperCase() === 'PENDING',
  ).length

  return (
    <>
      <MobileHeader />
      <main className="flex flex-1 flex-col gap-5 px-4 py-4 max-w-xl mx-auto w-full">
        {/* Top Greeting */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              {greeting}, {officerName}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Here's your inspection overview.
            </p>
          </div>
          <Link
            to={ROUTES.profile}
            className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xs hover:bg-primary/20 transition-colors"
            aria-label="View profile"
          >
            <User className="size-4.5" />
          </Link>
        </div>

        {/* Primary Action: Start New Inspection Card */}
        <div className="rounded-2xl border-2 border-primary/20 bg-card p-5 shadow-soft">
          <div className="flex items-start justify-between mb-3">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                <Camera className="size-3" /> Field Inspection
              </span>
              <h2 className="text-base font-bold text-foreground">
                Start New Inspection
              </h2>
              <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                Capture a new onion sample and begin analysis.
              </p>
            </div>
          </div>
          <Link to={ROUTES.newInspection}>
            <PrimaryButton fullWidth className="gap-2 h-11 text-xs font-semibold shadow-xs">
              <Plus className="size-4" />
              Start Inspection
            </PrimaryButton>
          </Link>
        </div>

        {/* Independent Re-audit Requests Card */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3.5 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <ClipboardCheck className="size-4.5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-semibold text-foreground truncate">
                Independent Re-audit Requests
              </h2>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">
                {reAuditsQuery.isPending ? (
                  <span>Checking requests…</span>
                ) : pendingReAuditsCount > 0 ? (
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {pendingReAuditsCount} Pending
                  </span>
                ) : (
                  <span>No pending re-audit requests</span>
                )}
              </p>
            </div>
          </div>
          <Link
            to={ROUTES.reAudits}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/60 transition-colors shadow-2xs cursor-pointer shrink-0"
          >
            <span>View Requests</span>
            <ChevronRight className="size-3.5 text-muted-foreground" />
          </Link>
        </div>

        {/* KPI Row (User-specific) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-semibold">Inspections</span>
              <Layers className="size-3.5 text-primary" />
            </div>
            <p className="text-xl font-extrabold text-foreground">
              {inspections.length}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-semibold">Completed</span>
              <TrendingUp className="size-3.5 text-success" />
            </div>
            <p className="text-xl font-extrabold text-foreground">
              {completed.length}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-semibold">Pending Review</span>
              <AlertCircle className="size-3.5 text-warning" />
            </div>
            <p className="text-xl font-extrabold text-foreground">
              {pendingReviews.length}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-semibold">Certificates</span>
              <FileCheck2 className="size-3.5 text-purple-600" />
            </div>
            <p className="text-xl font-extrabold text-foreground">
              {certificatesCount}
            </p>
          </div>
        </div>

        {/* Quick Actions (All functional) */}
        <div className="space-y-2">
          <SectionHeader title="Quick Actions" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Link
              to={ROUTES.inspections}
              className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-3 text-xs font-semibold text-foreground shadow-2xs hover:bg-surface-muted transition-colors"
            >
              <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shrink-0">
                <History className="size-3.5" />
              </div>
              <span>History</span>
            </Link>

            <Link
              to={ROUTES.analytics}
              className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-3 text-xs font-semibold text-foreground shadow-2xs hover:bg-surface-muted transition-colors"
            >
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                <BarChart3 className="size-3.5" />
              </div>
              <span>Analytics</span>
            </Link>

            <Link
              to="/verify"
              className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-3 text-xs font-semibold text-foreground shadow-2xs hover:bg-surface-muted transition-colors"
            >
              <div className="flex size-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 shrink-0">
                <QrCode className="size-3.5" />
              </div>
              <span>Verify QR</span>
            </Link>
          </div>
        </div>

        {/* Recent Inspections Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <SectionHeader
              title="Recent Inspections"
              description="Your latest procurement centre audits"
            />
            {inspections.length > 5 ? (
              <Link
                to={ROUTES.inspections}
                className="text-xs font-medium text-primary hover:underline"
              >
                View all ({inspections.length})
              </Link>
            ) : null}
          </div>

          {historyQuery.isPending ? (
            <p className="text-xs text-muted-foreground">Loading inspections…</p>
          ) : historyQuery.isError ? (
            <p className="text-xs text-destructive" role="alert">
              Unable to load inspections right now. Check your connection.
            </p>
          ) : inspections.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-surface-muted/50 p-6 text-center">
              <ClipboardCheck className="size-8 text-muted-foreground/60 mb-2" />
              <p className="text-xs font-semibold text-foreground">
                No inspections recorded yet
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">
                Start your first inspection to audit a sample lot and generate verifiable quality documentation.
              </p>
              <Link to={ROUTES.newInspection} className="mt-3">
                <PrimaryButton className="h-8.5 px-3 text-xs">
                  <Plus className="mr-1 size-3.5" />
                  New Inspection
                </PrimaryButton>
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {inspections.slice(0, 5).map((item) => {
                const statusType =
                  item.status === 'rejected'
                    ? 'rejected'
                    : item.status === 'reviewed' || Boolean(item.certificateId)
                      ? 'completed'
                      : item.status === 'draft' || item.status === 'in_progress'
                        ? 'in_progress'
                        : 'completed'

                const gradeDisplay = item.grade || 'Pending'

                return (
                  <Link
                    key={item.id}
                    to={resumeHref(item)}
                    className="flex items-center justify-between rounded-xl border border-border bg-card p-3.5 shadow-2xs hover:border-primary/40 hover:bg-muted/30 transition-all group"
                  >
                    <div className="space-y-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-foreground">
                          {item.id}
                        </span>
                        <span className="text-[11px] text-muted-foreground truncate">
                          • {item.variety}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>
                          {new Date(item.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        <span>•</span>
                        <span>{item.totalOnions ? `${item.totalOnions} bulbs` : 'Pending count'}</span>
                        <span>•</span>
                        <span className="truncate">{item.location}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right">
                        <span className="block text-xs font-bold text-foreground">
                          {gradeDisplay}
                        </span>
                      </div>
                      <StatusBadge
                        status={statusType}
                        label={item.status === 'reviewed' || Boolean(item.certificateId) ? 'Certified' : item.status}
                      />
                      <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </>
  )
}
