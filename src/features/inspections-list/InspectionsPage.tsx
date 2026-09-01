import { InspectionCard, SectionHeader } from '@/components/shared'
import { recentInspections } from '@/lib/demo-data'

export function InspectionsPage() {
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
        description={`${recentInspections.length} records`}
      />
      <div className="space-y-3">
        {recentInspections.map((inspection) => (
          <InspectionCard key={inspection.id} inspection={inspection} />
        ))}
      </div>
    </main>
  )
}
