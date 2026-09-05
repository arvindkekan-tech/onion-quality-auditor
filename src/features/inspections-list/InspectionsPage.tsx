import { ClipboardList } from 'lucide-react'

import { EmptyState, InspectionCard, SectionHeader } from '@/components/shared'
import { useDeleteInspection, useInspectionHistory } from '@/features/inspections/hooks'
import type { InspectionListItem } from '@/lib/demo-data'
import type { InspectionHistoryItem } from '@/types/inspection'

function toHistoryCard(item: InspectionHistoryItem): InspectionListItem {
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

function resumeHref(item: InspectionHistoryItem) {
  if (item.certificateId) return `/certificate/${item.certificateId}`
  if (item.reviewSubmitted) return `/inspection/${item.id}/review`
  if (item.analysisStatus === 'completed') {
    return `/inspection/${item.id}/results`
  }
  if (item.analysisStatus === 'pending' || item.analysisStatus === 'processing') {
    return `/inspection/${item.id}/analysis?resume=true`
  }
  if (item.analysisStatus === 'failed' && item.imageId) {
    return `/inspection/${item.id}/quality?imageId=${encodeURIComponent(item.imageId)}`
  }
  if (item.imageId) {
    return `/inspection/${item.id}/quality?imageId=${encodeURIComponent(item.imageId)}`
  }
  return `/inspection/${item.id}/capture`
}

export function InspectionsPage() {
  const historyQuery = useInspectionHistory()
  const deleteInspection = useDeleteInspection()
  const inspections = historyQuery.data?.map(toHistoryCard) ?? []

  function handleDelete(inspectionId: string) {
    if (!window.confirm('Delete this inspection and its uploaded images?')) return
    deleteInspection.mutate(inspectionId)
  }

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
          {deleteInspection.isError ? (
            <p className="text-sm text-destructive" role="alert">
              Unable to delete inspection. Please try again.
            </p>
          ) : null}
          {inspections.map((inspection) => (
            <InspectionCard
              key={inspection.id}
              inspection={inspection}
              onDelete={() => handleDelete(inspection.id)}
              isDeleting={deleteInspection.isPending && deleteInspection.variables === inspection.id}
              href={resumeHref(historyQuery.data?.find((item) => item.id === inspection.id) ?? {
                id: inspection.id,
                variety: inspection.batchId,
                location: inspection.centre,
                createdAt: inspection.dateTime,
                status: 'in_progress',
                reviewSubmitted: false,
              })}
            />
          ))}
        </div>
      )}
    </main>
  )
}
