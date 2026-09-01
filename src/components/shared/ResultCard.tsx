import { cn } from '@/lib/utils'

type ResultCardProps = {
  label: string
  value: string | number
  sublabel?: string
  highlight?: boolean
  className?: string
}

export function ResultCard({
  label,
  value,
  sublabel,
  highlight,
  className,
}: ResultCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border p-3',
        highlight
          ? 'border-primary/20 bg-primary/5'
          : 'border-border bg-card shadow-soft',
        className,
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1 font-semibold',
          highlight ? 'text-xl text-primary' : 'text-lg text-foreground',
        )}
      >
        {value}
      </p>
      {sublabel ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{sublabel}</p>
      ) : null}
    </div>
  )
}
