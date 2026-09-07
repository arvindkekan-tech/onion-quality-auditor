import { Scale, ShieldAlert, Sparkles } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { cn } from '@/lib/utils'
import type { WhyThisGrade } from '@/types/inspection'

interface WhyThisGradeCardProps {
  data?: WhyThisGrade | Record<string, any> | null
  className?: string
  compact?: boolean
}

export function WhyThisGradeCard({
  data,
  className,
  compact = false,
}: WhyThisGradeCardProps) {
  if (!data) return null

  const grade = data.grade || 'Pending'
  const gradeStatus =
    grade.toLowerCase().includes('grade a')
      ? 'grade_a'
      : grade.toLowerCase().includes('urs')
        ? 'urs'
        : 'rejected'

  const sampleSize = data.sampleSize ?? 0
  const healthyCount = data.healthyCount ?? 0
  const healthyPct = data.healthyPct ?? 0
  const defectsCount = data.defectsCount ?? (data.rottenDamagedCount ?? 0) + (data.sproutedCount ?? 0)
  const defectPct = data.defectPct ?? 0
  const rottenCount = data.rottenDamagedCount ?? 0
  const sproutedCount = data.sproutedCount ?? 0
  const overridesCount = data.officerOverridesCount ?? 0
  const narrative = data.narrative || ''

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-4 shadow-soft space-y-3',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Scale className="size-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Why This Grade?
            </h3>
            <p className="text-[11px] text-muted-foreground">
              APMC Decision Matrix & Quantitative Evidence
            </p>
          </div>
        </div>
        <StatusBadge status={gradeStatus} label={grade} />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-surface-muted p-2">
          <p className="text-[10px] text-muted-foreground">Sample Coverage</p>
          <p className="text-sm font-bold text-foreground">{sampleSize} bulbs</p>
        </div>
        <div className="rounded-lg bg-surface-muted p-2">
          <p className="text-[10px] text-muted-foreground">Healthy Rate</p>
          <p className="text-sm font-bold text-success">
            {healthyPct}% <span className="text-[10px] font-normal text-muted-foreground">({healthyCount})</span>
          </p>
        </div>
        <div className="rounded-lg bg-surface-muted p-2">
          <p className="text-[10px] text-muted-foreground">Defect Ratio</p>
          <p className={cn(
            'text-sm font-bold',
            defectPct <= 5.0 ? 'text-success' : defectPct <= 15.0 ? 'text-warning' : 'text-destructive',
          )}>
            {defectPct}% <span className="text-[10px] font-normal text-muted-foreground">({defectsCount})</span>
          </p>
        </div>
      </div>

      {/* Defect Breakdown chips */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="font-semibold text-foreground">Defects Breakdown:</span>
        <span className="rounded bg-destructive/10 px-2 py-0.5 font-medium text-destructive">
          {rottenCount} rot/damaged
        </span>
        <span className="rounded bg-amber-500/10 px-2 py-0.5 font-medium text-amber-600">
          {sproutedCount} sprouted
        </span>
        {data.uncertainCount ? (
          <span className="rounded bg-blue-500/10 px-2 py-0.5 font-medium text-blue-600">
            {data.uncertainCount} uncertain
          </span>
        ) : null}
      </div>

      {/* Narrative Box */}
      {narrative ? (
        <div className="rounded-lg border border-border/80 bg-surface-muted/80 p-3 text-xs leading-relaxed text-muted-foreground">
          <div className="mb-1 flex items-center gap-1.5 font-semibold text-foreground">
            <Sparkles className="size-3.5 text-primary" />
            <span>Determination Logic</span>
          </div>
          <p>{narrative}</p>
        </div>
      ) : null}

      {/* Officer Overrides Notice */}
      {overridesCount > 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2 text-[11px] text-primary">
          <ShieldAlert className="size-3.5 shrink-0" />
          <span>
            <strong>{overridesCount} manual inspector override(s)</strong> integrated into final calculation.
          </span>
        </div>
      ) : null}

      {/* Thresholds Footer */}
      {!compact ? (
        <div className="border-t border-border/60 pt-2 text-[10px] text-muted-foreground">
          <p className="font-medium text-foreground">APMC Tolerance Standards:</p>
          <div className="mt-1 flex flex-wrap justify-between gap-1 text-[10px]">
            <span>Grade A: &le; 5.0% defects</span>
            <span>URS: 5.1% &ndash; 15.0% defects</span>
            <span>Rejected: &gt; 15.0% defects</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
