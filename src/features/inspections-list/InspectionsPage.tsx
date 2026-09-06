import { useState } from 'react'
import { ClipboardList, Search, X } from 'lucide-react'

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

export function InspectionsPage() {
  const historyQuery = useInspectionHistory()
  const deleteInspection = useDeleteInspection()
  const [searchTerm, setSearchTerm] = useState('')

  const allItems = historyQuery.data ?? []

  const filteredItems = allItems.filter((item) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      item.id.toLowerCase().includes(term) ||
      item.variety.toLowerCase().includes(term) ||
      item.location.toLowerCase().includes(term) ||
      (item.grade && item.grade.toLowerCase().includes(term)) ||
      item.status.toLowerCase().includes(term)
    )
  })

  const inspections = filteredItems.map(toHistoryCard)

  function handleDelete(inspectionId: string) {
    if (!window.confirm('Delete this inspection and all associated data? This action is permanent.')) return
    deleteInspection.mutate(inspectionId)
  }

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-4 pt-5">
      <div>
        <h1 className="text-lg font-semibold">Inspections History</h1>
        <p className="text-xs text-muted-foreground">
          All procurement centre audit records
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by ID, variety, centre, or grade…"
          className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-9 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-soft"
        />
        {searchTerm ? (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <SectionHeader
        title="Audit Records"
        description={`${filteredItems.length} of ${allItems.length} records`}
      />

      {historyQuery.isPending ? (
        <p className="text-sm text-muted-foreground">Loading inspections…</p>
      ) : historyQuery.isError ? (
        <p className="text-sm text-destructive" role="alert">
          Unable to load inspections.
        </p>
      ) : allItems.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No inspections yet"
          description="Completed inspections will appear here."
        />
      ) : filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface-muted p-6 text-center text-xs text-muted-foreground">
          No inspections matching &quot;{searchTerm}&quot;.
        </div>
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
              href={resumeHref(allItems.find((item) => item.id === inspection.id) ?? {
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
