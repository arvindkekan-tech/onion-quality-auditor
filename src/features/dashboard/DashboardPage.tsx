import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ClipboardCheck,
  Layers,
  Plus,
  TrendingUp,
} from 'lucide-react'

import { MobileHeader } from '@/components/layout/MobileHeader'
import {
  InspectionCard,
  MetricCard,
  PrimaryButton,
  SectionHeader,
} from '@/components/shared'
import {
  useInspectionHistory,
} from '@/features/inspections/hooks'
import type { InspectionHistoryItem } from '@/types/inspection'
import { ROUTES } from '@/lib/constants'

function toCard(item: InspectionHistoryItem) {
  return {
    id: item.id,
    batchId: item.variety,
    centre: item.location,
    dateTime: item.createdAt,
    status: item.status === 'rejected' ? 'rejected' as const :
      item.status === 'draft' || item.status === 'in_progress'
        ? 'in_progress' as const
        : 'completed' as const,
    grade: item.grade ?? 'Pending',
    sampleCount: item.totalOnions ?? 0,
  }
}

export function DashboardPage() {
  const historyQuery = useInspectionHistory()
  const inspections = historyQuery.data ?? []
  const completed = inspections.filter(
    (item) => item.analysisStatus === 'completed' || item.status === 'completed' || item.status === 'reviewed',
  )
  const pendingReviews = inspections.filter(
    (item) => item.analysisStatus === 'completed' && !item.reviewSubmitted && !item.certificateId,
  )
  const today = new Date().toDateString()
  const inspectionsToday = inspections.filter(
    (item) => new Date(item.createdAt).toDateString() === today,
  ).length
  const gradeACount = inspections.filter((item) => item.grade?.toLowerCase() === 'grade a').length

  return (
    <>
      <MobileHeader />
      <main className="flex flex-1 flex-col gap-5 px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="Inspections Today"
            value={inspectionsToday}
            icon={ClipboardCheck}
          />
          <MetricCard
            label="Total Inspections"
            value={inspections.length}
            icon={Layers}
          />
          <MetricCard
            label="Completed"
            value={completed.length}
            suffix="%"
            icon={TrendingUp}
          />
          <MetricCard
            label="Pending Reviews"
            value={pendingReviews.length}
            icon={AlertCircle}
          />
        </div>

        <Link to={ROUTES.newInspection}>
          <PrimaryButton fullWidth className="gap-2">
            <Plus className="size-4" aria-hidden />
            Start New Inspection
          </PrimaryButton>
        </Link>

        <section className="space-y-3">
          <SectionHeader
            title="Pending Human Review"
            description={`${pendingReviews.length} batches awaiting inspector decision`}
          />
          {historyQuery.isPending ? (
            <p className="text-xs text-muted-foreground">Loading inspections…</p>
          ) : pendingReviews.length > 0 ? (
            pendingReviews.map((inspection) => (
              <InspectionCard key={inspection.id} inspection={toCard(inspection)} />
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No pending reviews.</p>
          )}
        </section>

        <section className="space-y-3">
          <SectionHeader
            title="Recent Inspections"
            description="Latest procurement centre audits"
          />
          {historyQuery.isError ? (
            <p className="text-xs text-destructive" role="alert">Unable to load inspections.</p>
          ) : inspections.slice(0, 5).map((inspection) => (
            <InspectionCard key={inspection.id} inspection={toCard(inspection)} />
          ))}
          {!historyQuery.isPending && !historyQuery.isError && inspections.length === 0 ? (
            <p className="text-xs text-muted-foreground">No inspections yet.</p>
          ) : null}
        </section>

        <p className="text-xs text-muted-foreground">
          Grade A inspections: {gradeACount} of {inspections.length}
        </p>
      </main>
    </>
  )
}
