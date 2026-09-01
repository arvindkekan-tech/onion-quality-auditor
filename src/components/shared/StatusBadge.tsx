import { cn } from '@/lib/utils'

type StatusBadgeProps = {
  status:
    | 'completed'
    | 'pending_review'
    | 'in_progress'
    | 'rejected'
    | 'grade_a'
    | 'urs'
    | 'success'
    | 'warning'
    | 'error'
    | 'info'
  label?: string
  className?: string
}

const statusStyles: Record<StatusBadgeProps['status'], string> = {
  completed: 'bg-secondary text-secondary-foreground',
  pending_review: 'bg-accent text-accent-foreground',
  in_progress: 'bg-info/10 text-info',
  rejected: 'bg-destructive/10 text-destructive',
  grade_a: 'bg-success/10 text-success',
  urs: 'bg-warning/10 text-warning',
  success: 'bg-success/10 text-success',
  warning: 'bg-accent text-accent-foreground',
  error: 'bg-destructive/10 text-destructive',
  info: 'bg-info/10 text-info',
}

const defaultLabels: Record<StatusBadgeProps['status'], string> = {
  completed: 'Completed',
  pending_review: 'Pending Review',
  in_progress: 'In Progress',
  rejected: 'Rejected',
  grade_a: 'Grade A',
  urs: 'URS',
  success: 'Passed',
  warning: 'Borderline',
  error: 'Failed',
  info: 'Processing',
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        statusStyles[status],
        className,
      )}
    >
      {label ?? defaultLabels[status]}
    </span>
  )
}
