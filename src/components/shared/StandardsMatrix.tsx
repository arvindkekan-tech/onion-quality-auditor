import { CheckCircle2, Eye, FileText, FlaskConical, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StandardsMatrixItem } from '@/types/inspection'

interface StandardsMatrixProps {
  items?: StandardsMatrixItem[] | Array<Record<string, any>> | null
  className?: string
}

export function StandardsMatrix({ items, className }: StandardsMatrixProps) {
  if (!items || items.length === 0) return null

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
            <FileText className="size-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Standards-to-Evidence Matrix
            </h3>
            <p className="text-[11px] text-muted-foreground">
              APMC Optical Evidence vs Physical Verification
            </p>
          </div>
        </div>
        <span className="rounded-full border border-border bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {items.length} Criteria
        </span>
      </div>

      <div className="space-y-2.5">
        {items.map((item, idx) => {
          const isManual = Boolean(item.requiresManualCheck)
          const isCompliant = item.compliant === true
          const isNonCompliant = item.compliant === false

          return (
            <div
              key={item.parameter || idx}
              className={cn(
                'rounded-lg border p-2.5 text-xs transition-colors',
                isManual
                  ? 'border-dashed border-border/80 bg-surface-muted/50'
                  : isNonCompliant
                    ? 'border-destructive/30 bg-destructive/5'
                    : 'border-border/80 bg-surface-muted/70',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    {isManual ? (
                      <FlaskConical className="size-3.5 text-muted-foreground" />
                    ) : (
                      <Eye className="size-3.5 text-primary" />
                    )}
                    <span className="font-semibold text-foreground">
                      {item.parameter}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Method: {item.detectionMethod}
                  </p>
                </div>

                {isManual ? (
                  <span className="shrink-0 rounded border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Physical Field Check
                  </span>
                ) : isCompliant ? (
                  <span className="flex shrink-0 items-center gap-1 rounded border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                    <CheckCircle2 className="size-3" />
                    Compliant
                  </span>
                ) : (
                  <span className="flex shrink-0 items-center gap-1 rounded border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                    <XCircle className="size-3" />
                    Defect Flagged
                  </span>
                )}
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border/60 pt-2 text-[11px]">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Procurement Tolerance:
                  </span>
                  <p className="font-medium text-foreground">
                    {item.procurementThreshold}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Measured / Status:
                  </span>
                  <p className={cn(
                    'font-medium',
                    isNonCompliant ? 'text-destructive font-semibold' : 'text-foreground',
                  )}>
                    {item.measuredValue}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-[10px] text-muted-foreground italic pt-1">
        * Optical AI validates surface defects and size calibers. Internal rot cut tests and moisture probes require physical officer inspection per APMC protocols.
      </p>
    </div>
  )
}
