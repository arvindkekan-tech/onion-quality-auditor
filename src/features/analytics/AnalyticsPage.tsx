import { BarChart3 } from 'lucide-react'

import { EmptyState, MetricCard, SectionHeader } from '@/components/shared'
import { useInspectionHistory } from '@/features/inspections/hooks'

export function AnalyticsPage() {
  const historyQuery = useInspectionHistory()
  const inspections = historyQuery.data ?? []

  const completed = inspections.filter(
    (item) => item.analysisStatus === 'completed' || item.status === 'completed' || item.status === 'reviewed',
  )
  const gradeACount = inspections.filter((item) => item.grade?.toLowerCase() === 'grade a').length
  const rejectedCount = inspections.filter(
    (item) => item.status === 'rejected' || item.grade?.toLowerCase().includes('reject'),
  ).length
  const totalOnionsAudited = inspections.reduce((sum, item) => sum + (item.totalOnions ?? 0), 0)

  const gradeCounts = [
    { grade: 'Grade A', count: gradeACount, badgeClass: 'text-success' },
    {
      grade: 'URS (Under Regulation Size)',
      count: inspections.filter((item) => item.grade?.toLowerCase() === 'urs').length,
      badgeClass: 'text-warning',
    },
    { grade: 'Rejected', count: rejectedCount, badgeClass: 'text-destructive' },
    {
      grade: 'Pending / In Progress',
      count: inspections.filter(
        (item) => !item.grade || item.grade.toLowerCase() === 'pending' || item.grade.toLowerCase() === 'unrated',
      ).length,
      badgeClass: 'text-muted-foreground',
    },
  ]

  // Group by centre
  const centreMap = new Map<string, { total: number; gradeA: number; rejected: number }>()
  inspections.forEach((item) => {
    const loc = item.location || 'Unknown APMC'
    const existing = centreMap.get(loc) ?? { total: 0, gradeA: 0, rejected: 0 }
    existing.total += 1
    if (item.grade?.toLowerCase() === 'grade a') existing.gradeA += 1
    if (item.status === 'rejected' || item.grade?.toLowerCase().includes('reject')) existing.rejected += 1
    centreMap.set(loc, existing)
  })
  const centreBreakdown = Array.from(centreMap.entries()).map(([centre, stats]) => ({
    centre,
    ...stats,
    gradeAPct: stats.total > 0 ? Math.round((stats.gradeA / stats.total) * 100) : 0,
  }))

  return (
    <>
      <main className="flex flex-1 flex-col gap-5 px-4 py-4 pt-5">
        <div>
          <h1 className="text-lg font-semibold">Quality Analytics</h1>
          <p className="text-xs text-muted-foreground">
            Procurement quality overview across active centres
          </p>
        </div>

        {historyQuery.isPending ? (
          <p className="text-sm text-muted-foreground">Loading analytics…</p>
        ) : inspections.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No data available"
            description="Complete inspections to view quality metrics and centre breakdowns."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Total Audits"
                value={inspections.length}
              />
              <MetricCard
                label="Completed"
                value={completed.length}
              />
              <MetricCard
                label="Onions Inspected"
                value={totalOnionsAudited}
              />
              <MetricCard
                label="Grade A Batches"
                value={gradeACount}
              />
              <MetricCard
                label="Rejected Batches"
                value={rejectedCount}
                className="col-span-2"
              />
            </div>

            <section className="space-y-3">
              <SectionHeader
                title="Grade Distribution"
                description="Aggregated inspection grade classification"
              />
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-muted text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Grade Category</th>
                      <th className="px-3 py-2 text-right font-medium">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gradeCounts.map((row) => (
                      <tr key={row.grade} className="border-b border-border last:border-0">
                        <td className="px-3 py-2.5 text-xs font-medium">{row.grade}</td>
                        <td className={`px-3 py-2.5 text-right font-semibold tabular-nums ${row.badgeClass}`}>
                          {row.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {centreBreakdown.length > 0 ? (
              <section className="space-y-3">
                <SectionHeader
                  title="Procurement Centres"
                  description="Quality metrics per APMC centre"
                />
                <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-surface-muted text-left text-xs text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Centre</th>
                        <th className="px-3 py-2 text-center font-medium">Audits</th>
                        <th className="px-3 py-2 text-right font-medium">Grade A %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {centreBreakdown.map((centre) => (
                        <tr key={centre.centre} className="border-b border-border last:border-0">
                          <td className="px-3 py-2.5 text-xs font-medium">{centre.centre}</td>
                          <td className="px-3 py-2.5 text-center text-xs tabular-nums text-muted-foreground">
                            {centre.total}
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs font-semibold tabular-nums text-success">
                            {centre.gradeAPct}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
          </>
        )}
      </main>
    </>
  )
}
