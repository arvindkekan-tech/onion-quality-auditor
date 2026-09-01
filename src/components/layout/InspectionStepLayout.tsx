import type { ReactNode } from 'react'

import { INSPECTION_STEPS, type InspectionStepKey } from '@/lib/constants'
import { Progress } from '@/components/ui/progress'

type InspectionStepLayoutProps = {
  currentStep: InspectionStepKey
  children: ReactNode
}

export function InspectionStepLayout({
  currentStep,
  children,
}: InspectionStepLayoutProps) {
  const stepIndex = INSPECTION_STEPS.findIndex((step) => step.key === currentStep)
  const progress =
    stepIndex >= 0 ? ((stepIndex + 1) / INSPECTION_STEPS.length) * 100 : 0

  return (
    <div className="flex flex-1 flex-col">
      <div className="space-y-2 border-b px-4 py-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Step {stepIndex + 1} of {INSPECTION_STEPS.length}
          </span>
          <span>{INSPECTION_STEPS[stepIndex]?.label}</span>
        </div>
        <Progress value={progress} />
      </div>
      <div className="flex flex-1 flex-col px-4 py-6">{children}</div>
    </div>
  )
}
