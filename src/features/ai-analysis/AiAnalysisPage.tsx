import { Brain, CheckCircle2, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { InspectionStepLayout } from '@/components/layout/InspectionStepLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { PrimaryButton } from '@/components/shared'
import { Progress } from '@/components/ui/progress'
import {
  useAnalysisStatus,
  useStartAnalysis,
} from '@/features/inspections/hooks'
import { analysisSteps } from '@/lib/demo-data'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'

export function AiAnalysisPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const startAnalysis = useStartAnalysis(id)
  const analysisStatus = useAnalysisStatus(id)
  const hasStarted = useRef(false)
  const [showComplete, setShowComplete] = useState(false)
  const isResuming = searchParams.get('resume') === 'true'

  useEffect(() => {
    if (!isResuming && !hasStarted.current) {
      hasStarted.current = true
      startAnalysis.mutate()
    }
  }, [isResuming, startAnalysis])

  const status = analysisStatus.data
  const isComplete = status?.status === 'completed'
  const progress = status?.progress ?? 5

  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => setShowComplete(true), 500)
      return () => clearTimeout(timer)
    }
  }, [isComplete])

  const activeStepIndex = Math.min(
    analysisSteps.length - 1,
    Math.floor((progress / 100) * analysisSteps.length),
  )

  return (
    <>
      <PageHeader
        title="AI Analysis"
        subtitle="Automated visual assessment"
        backTo={ROUTES.imageQuality(id)}
      />
      <InspectionStepLayout currentStep="detect">
        <div className="flex flex-1 flex-col items-center justify-center space-y-6 py-4">
          <div
            className={cn(
              'flex size-20 items-center justify-center rounded-full',
              isComplete ? 'bg-success/10' : 'bg-primary/10',
            )}
          >
            {isComplete ? (
              <CheckCircle2 className="size-10 text-success" aria-hidden />
            ) : (
              <Brain className="size-10 animate-pulse text-primary" aria-hidden />
            )}
          </div>

          <div className="text-center">
            <h2 className="text-lg font-semibold">
              {isComplete ? 'Analysis Complete' : 'Analysing Sample'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Analysis provider configured on the backend
            </p>
          </div>

          <div className="w-full space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            {status?.message ? (
              <p className="text-center text-xs text-muted-foreground">
                {status.message}
              </p>
            ) : null}
          </div>

          <div className="w-full space-y-2 rounded-xl border border-border bg-card p-4 shadow-soft">
            {analysisSteps.map((step, index) => {
              const isDone = isComplete || index < activeStepIndex
              const isCurrent = !isComplete && index === activeStepIndex
              return (
                <div key={step} className="flex items-center gap-3">
                  {isDone ? (
                    <CheckCircle2 className="size-4 text-success" aria-hidden />
                  ) : isCurrent ? (
                    <Loader2
                      className="size-4 animate-spin text-primary"
                      aria-hidden
                    />
                  ) : (
                    <div className="size-4 rounded-full border border-border" />
                  )}
                  <span
                    className={cn(
                      'text-sm',
                      isDone
                        ? 'text-foreground'
                        : isCurrent
                          ? 'font-medium text-primary'
                          : 'text-muted-foreground',
                    )}
                  >
                    {step}
                  </span>
                </div>
              )
            })}
          </div>

          {showComplete ? (
            <PrimaryButton
              fullWidth
              onClick={() => navigate(ROUTES.inspectionResults(id))}
            >
              View Results
            </PrimaryButton>
          ) : null}

          {!isComplete && analysisStatus.isError ? (
            <p className="text-sm text-destructive" role="alert">
              Analysis status unavailable. Tap refresh to retry.
            </p>
          ) : null}

          {!isComplete ? (
            <button
              type="button"
              onClick={() => analysisStatus.refetch()}
              className="text-xs text-primary underline-offset-2 hover:underline"
            >
              Refresh status
            </button>
          ) : null}
        </div>
      </InspectionStepLayout>
    </>
  )
}
