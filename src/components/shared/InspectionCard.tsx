import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { StatusBadge } from '@/components/shared/StatusBadge'
import type { InspectionListItem } from '@/lib/demo-data'
import { cn } from '@/lib/utils'

type InspectionCardProps = {
  inspection: InspectionListItem
  href?: string
  className?: string
}

function gradeToStatus(
  grade: string,
): 'grade_a' | 'urs' | 'rejected' | 'info' {
  if (grade.toLowerCase().includes('reject')) return 'rejected'
  if (grade.toLowerCase().includes('urs')) return 'urs'
  if (grade.toLowerCase().includes('grade')) return 'grade_a'
  return 'info'
}

export function InspectionCard({ inspection, href, className }: InspectionCardProps) {
  const content = (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-soft transition-colors',
        href && 'hover:bg-surface-muted',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{inspection.batchId}</p>
          <StatusBadge status={inspection.status} />
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {inspection.centre}
        </p>
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            {new Date(inspection.dateTime).toLocaleString('en-IN', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          <span>{inspection.sampleCount} onions</span>
          <StatusBadge status={gradeToStatus(inspection.grade)} label={inspection.grade} />
        </div>
      </div>
      {href ? (
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      ) : null}
    </div>
  )

  if (href) {
    return <Link to={href}>{content}</Link>
  }

  return content
}
