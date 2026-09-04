import { ClipboardList } from 'lucide-react'

import { EmptyState, InspectionCard, SectionHeader } from '@/components/shared'
import { useInspectionHistory } from '@/features/inspections/hooks'
import type { InspectionListItem } from '@/lib/demo-data'

function toHistoryCard(item: {
  id: string
  variety: string
  location: string
  createdAt: string
  status: string
  grade?: string | null
  totalOnions?: number | null
}): InspectionListItem {
  const status = item.status === 'rejected' ? 'rejected' :
    item.status === 'draft' || item.status === 'in_progress'
      ? 'in_progress'
      : 'completed'

  return {
    id: item.id,
    batchId: item.variety,
    centre: item.location,
    dateTime: item.createdAt,
    status,
    grade: item.grade ?? 'Pending',
    sampleCount: item.totalOnions ?? 0,
  }
}

export function InspectionsPage() {
  const historyQuery = useInspectionHistory()
  const inspections = historyQuery.data?.map(toHistoryCard) ?? []

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-4 pt-5">
      <div>
        <h1 className="text-lg font-semibold">Inspections</h1>
        <p className="text-xs text-muted-foreground">
          All procurement centre audits
        </p>
      </div>
      <SectionHeader
        title="All Inspections"
        description={`${inspections.length} records`}
      />
      {historyQuery.isPending ? (
        <p className="text-sm text-muted-foreground">Loading inspections…</p>
      ) : historyQuery.isError ? (
        <p className="text-sm text-destructive" role="alert">
          Unable to load inspections.
        </p>
      ) : inspections.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No inspections yet"
          description="Completed inspections will appear here."
        />
      ) : (
        <div className="space-y-3">
          {inspections.map((inspection) => (
            <InspectionCard key={inspection.id} inspection={inspection} />
          ))}
        </div>
      )}
    </main>
  )
}
