import type { ReactNode } from 'react'

import { StepProgress } from '@/components/layout/StepProgress'
import type { InspectionStepKey } from '@/lib/constants'

type InspectionStepLayoutProps = {
  currentStep: InspectionStepKey
  children: ReactNode
}

export function InspectionStepLayout({
  currentStep,
  children,
}: InspectionStepLayoutProps) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-border bg-card px-4 py-3">
        <StepProgress currentStep={currentStep} />
      </div>
      <div className="flex flex-1 flex-col px-4 py-4">{children}</div>
    </div>
  )
}
