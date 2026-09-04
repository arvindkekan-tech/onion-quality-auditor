import { useEffect } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { InspectionStepLayout } from '@/components/layout/InspectionStepLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  AlertBanner,
  PrimaryButton,
  StatusBadge,
} from '@/components/shared'
import { Progress } from '@/components/ui/progress'
import { useCheckImageQuality } from '@/features/inspections/hooks'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useInspectionDraftStore } from '@/stores/inspectionDraftStore'

type LocationState = {
  imageId?: string
}

export function ImageQualityCheckPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const queryImageId = new URLSearchParams(location.search).get('imageId')
  const imageId =
    queryImageId ?? (location.state as LocationState | null)?.imageId ?? 'demo-image'
  const previewUrl = useInspectionDraftStore((s) => s.previewUrl)
  const { mutate, isPending, data, isError } = useCheckImageQuality(id, imageId)

  useEffect(() => {
    mutate()
  }, [id, imageId, mutate])

  const overallScore = data?.score ?? 0
  const isBorderline = overallScore > 0 && overallScore < 85
  const isPassed = data?.passed ?? false

  return (
    <>
      <PageHeader
        title="Image Quality Check"
        subtitle="Pre-analysis verification"
        backTo={ROUTES.imageCapture(id)}
      />
      <InspectionStepLayout currentStep="quality">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-border bg-surface-muted">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Sample preview for quality check"
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center text-sm text-muted-foreground">
                Image preview
              </div>
            )}
          </div>

          {isPending ? (
            <p className="text-sm text-muted-foreground">Evaluating image quality…</p>
          ) : null}

          {data ? (
            <>
              <div
                className={cn(
                  'rounded-xl border p-4 text-center',
                  isPassed && !isBorderline
                    ? 'border-success/20 bg-success/5'
                    : isBorderline
                      ? 'border-warning/20 bg-accent'
                      : 'border-destructive/20 bg-destructive/5',
                )}
              >
                <p className="text-xs font-medium text-muted-foreground">
                  Overall Quality Score
                </p>
                <p className="mt-1 text-3xl font-bold text-foreground">
                  {overallScore}
                  <span className="text-lg text-muted-foreground">/100</span>
                </p>
                <div className="mt-2 flex justify-center">
                  <StatusBadge
                    status={isPassed ? (isBorderline ? 'warning' : 'success') : 'error'}
                    label={
                      isPassed
                        ? isBorderline
                          ? 'Borderline — Proceed with caution'
                          : 'Acceptable for analysis'
                        : 'Retake required'
                    }
                  />
                </div>
              </div>

              <div className="space-y-3">
                {data.checks?.map((check) => (
                  <div
                    key={check.key}
                    className="rounded-xl border border-border bg-card p-3 shadow-soft"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{check.label}</p>
                      <StatusBadge
                        status={check.passed ? 'success' : 'warning'}
                        label={check.passed ? 'Pass' : 'Borderline'}
                      />
                    </div>
                    <Progress value={check.score} className="mt-2 h-1.5" />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {check.explanation}
                    </p>
                  </div>
                ))}
              </div>

              {isPassed && !isBorderline ? (
                <AlertBanner variant="success" title="Quality verified">
                  Image meets capture standards. Safe to proceed to AI analysis.
                </AlertBanner>
              ) : null}
            </>
          ) : null}

          {isError ? (
            <AlertBanner variant="error" title="Quality check failed">
              Unable to verify image quality. Please retake the sample.
            </AlertBanner>
          ) : null}

          <PrimaryButton
            fullWidth
            disabled={!isPassed || isPending}
            onClick={() => navigate(ROUTES.aiAnalysis(id))}
          >
            Proceed to AI Analysis
          </PrimaryButton>
        </div>
      </InspectionStepLayout>
    </>
  )
}
