import { INSPECTION_STEPS, type InspectionStepKey } from '@/lib/constants'
import { cn } from '@/lib/utils'

type StepProgressProps = {
  currentStep: InspectionStepKey
  className?: string
}

export function StepProgress({ currentStep, className }: StepProgressProps) {
  const currentIndex = INSPECTION_STEPS.findIndex(
    (step) => step.key === currentStep,
  )

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Step {currentIndex + 1} of {INSPECTION_STEPS.length}
        </span>
        <span className="font-medium text-foreground">
          {INSPECTION_STEPS[currentIndex]?.label}
        </span>
      </div>
      <div className="flex gap-1">
        {INSPECTION_STEPS.map((step, index) => (
          <div key={step.key} className="flex-1">
            <div
              className={cn(
                'h-1.5 rounded-full transition-colors',
                index <= currentIndex ? 'bg-primary' : 'bg-border',
              )}
              aria-hidden
            />
            <p
              className={cn(
                'mt-1 hidden text-[9px] sm:block',
                index === currentIndex
                  ? 'font-semibold text-primary'
                  : 'text-muted-foreground',
              )}
            >
              {step.shortLabel}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
