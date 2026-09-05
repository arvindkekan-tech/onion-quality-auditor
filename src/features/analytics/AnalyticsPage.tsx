import { MetricCard, SectionHeader } from '@/components/shared'
import { useInspectionHistory } from '@/features/inspections/hooks'

export function AnalyticsPage() {
  const historyQuery = useInspectionHistory()
  const inspections = historyQuery.data ?? []
  const completed = inspections.filter((item) => item.analysisStatus === 'completed')
  const gradeACount = inspections.filter((item) => item.grade?.toLowerCase() === 'grade a').length
  const rejectedCount = inspections.filter((item) => item.grade?.toLowerCase().includes('reject')).length
  const gradeCounts = ['Grade A', 'URS', 'Rejected'].map((grade) => ({
    grade,
    count: inspections.filter((item) => item.grade === grade).length,
  }))

  return (
    <>
      <main className="flex flex-1 flex-col gap-5 px-4 py-4 pt-5">
        <div>
          <h1 className="text-lg font-semibold">Analytics</h1>
          <p className="text-xs text-muted-foreground">
            Procurement quality overview
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="Total Inspections"
            value={inspections.length}
          />
          <MetricCard
            label="Completed"
            value={completed.length}
          />
          <MetricCard
            label="Grade A"
            value={gradeACount}
          />
          <MetricCard
            label="Rejected"
            value={rejectedCount}
            className="col-span-2"
          />
        </div>

        <section className="space-y-3">
          <SectionHeader
            title="Centre Breakdown"
            description="Persisted grade distribution"
          />
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Grade</th>
                  <th className="px-3 py-2 font-medium">Count</th>
                </tr>
              </thead>
              <tbody>
                {gradeCounts.map((row) => (
                  <tr key={row.grade} className="border-b border-border last:border-0">
                    <td className="px-3 py-2.5 text-xs font-medium">{row.grade}</td>
                    <td className="px-3 py-2.5 tabular-nums text-success">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  )
}
