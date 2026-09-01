import { MetricCard, SectionHeader } from '@/components/shared'
import { analyticsData } from '@/lib/demo-data'
import { cn } from '@/lib/utils'

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function MiniBarChart({
  data,
  color,
  label,
}: {
  data: number[]
  color: string
  label: string
}) {
  const max = Math.max(...data)
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-1.5" role="img" aria-label={`${label} trend chart`}>
        {data.map((value, index) => (
          <div key={dayLabels[index]} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={cn('w-full rounded-t-sm transition-all', color)}
              style={{ height: `${(value / max) * 80 + 8}px` }}
            />
            <span className="text-[9px] text-muted-foreground">
              {dayLabels[index]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AnalyticsPage() {
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
            label="Avg. Grade A"
            value={analyticsData.averageGradeA}
            suffix="%"
          />
          <MetricCard
            label="Avg. Rejected"
            value={analyticsData.averageRejected}
            suffix="%"
          />
          <MetricCard
            label="Low Confidence"
            value={analyticsData.lowConfidenceRate}
            suffix="%"
          />
          <MetricCard
            label="Best Centre"
            value={analyticsData.bestCentre.split(' ')[0]}
            suffix=""
            className="col-span-2"
          />
        </div>

        <MiniBarChart
          data={analyticsData.gradeATrend}
          color="bg-success"
          label="Grade A Trend (7 days)"
        />
        <MiniBarChart
          data={analyticsData.rejectedTrend}
          color="bg-destructive/70"
          label="Rejected Trend (7 days)"
        />

        <section className="space-y-3">
          <SectionHeader
            title="Centre Breakdown"
            description="Average grade by procurement centre"
          />
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Centre</th>
                  <th className="px-3 py-2 font-medium">Grade A</th>
                  <th className="px-3 py-2 font-medium">Rej.</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData.centreBreakdown.map((row) => (
                  <tr key={row.centre} className="border-b border-border last:border-0">
                    <td className="px-3 py-2.5 text-xs font-medium">
                      {row.centre.replace(' APMC', '')}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-success">
                      {row.gradeA}%
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-destructive">
                      {row.rejected}%
                    </td>
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
