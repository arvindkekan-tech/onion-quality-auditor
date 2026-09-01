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
  dashboardMetrics,
  pendingReviewInspections,
  recentInspections,
} from '@/lib/demo-data'
import { ROUTES } from '@/lib/constants'

export function DashboardPage() {
  return (
    <>
      <MobileHeader />
      <main className="flex flex-1 flex-col gap-5 px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="Inspections Today"
            value={dashboardMetrics.inspectionsToday}
            icon={ClipboardCheck}
          />
          <MetricCard
            label="Batches Audited"
            value={dashboardMetrics.batchesAudited}
            icon={Layers}
          />
          <MetricCard
            label="Avg. Grade A"
            value={dashboardMetrics.averageGradeA}
            suffix="%"
            icon={TrendingUp}
          />
          <MetricCard
            label="Pending Reviews"
            value={dashboardMetrics.pendingReviews}
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
            description={`${pendingReviewInspections.length} batches awaiting inspector decision`}
          />
          {pendingReviewInspections.length > 0 ? (
            pendingReviewInspections.map((inspection) => (
              <InspectionCard key={inspection.id} inspection={inspection} />
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
          {recentInspections.map((inspection) => (
            <InspectionCard key={inspection.id} inspection={inspection} />
          ))}
        </section>
      </main>
    </>
  )
}
