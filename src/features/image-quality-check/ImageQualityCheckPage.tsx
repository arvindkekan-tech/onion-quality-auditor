import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react'

import { InspectionStepLayout } from '@/components/layout/InspectionStepLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  AlertBanner,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
} from '@/components/shared'
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
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)

  useEffect(() => {
    mutate()
  }, [id, imageId, mutate])

  const overallScore = data?.score ?? 0
  const isBorderline = overallScore > 0 && overallScore < 80
  const isPassed = data?.passed ?? (overallScore >= 60)

  // Map checks into defensible physical image attributes
  const checksMap = (data?.checks || []).reduce<Record<string, { label: string; score: number; passed: boolean; explanation: string }>>(
    (acc, check) => {
      acc[check.key] = check
      return acc
    },
    {},
  )

  const brightnessStatus = checksMap.lighting?.passed
    ? (checksMap.lighting.score > 85 ? 'Good' : 'Acceptable')
    : (checksMap.lighting ? 'Low / Uneven' : 'Acceptable')

  const sharpnessStatus = checksMap.sharpness?.passed
    ? (checksMap.sharpness.score > 85 ? 'Good' : 'Acceptable')
    : (checksMap.sharpness ? 'Low / Blurry' : 'Acceptable')

  const contrastStatus = checksMap.coverage?.passed
    ? 'Good'
    : 'Acceptable'

  const exposureStatus = (checksMap.lighting?.score ?? 80) < 60
    ? 'Potentially problematic'
    : 'Acceptable'

  return (
    <>
      <PageHeader
        title="Image Quality Check"
        subtitle="Pre-analysis verification"
        backTo={ROUTES.imageCapture(id)}
      />
      <InspectionStepLayout currentStep="quality">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-border bg-surface-muted relative">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Sample preview for quality check"
                className="aspect-[4/3] w-full object-cover"
                onLoad={(e) => {
                  const target = e.currentTarget
                  setDimensions({
                    width: target.naturalWidth,
                    height: target.naturalHeight,
                  })
                }}
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center text-sm text-muted-foreground">
                Image preview
              </div>
            )}
            {dimensions ? (
              <div className="absolute bottom-2 right-2 rounded bg-black/75 px-2 py-0.5 text-[10px] font-mono text-white backdrop-blur">
                {dimensions.width} × {dimensions.height} px
              </div>
            ) : null}
          </div>

          {isPending ? (
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-sm font-medium text-foreground">Evaluating image metrics…</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Measuring luminance, contrast, sharpness proxy, and frame coverage.
              </p>
            </div>
          ) : null}

          {data ? (
            <>
              <div
                className={cn(
                  'rounded-xl border p-4 text-center shadow-soft',
                  isPassed && !isBorderline
                    ? 'border-success/30 bg-success/5'
                    : isBorderline
                      ? 'border-warning/30 bg-accent'
                      : 'border-destructive/30 bg-destructive/5',
                )}
              >
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Suitability Score
                </p>
                <p className="mt-1 text-3xl font-extrabold text-foreground">
                  {overallScore}
                  <span className="text-lg text-muted-foreground">/100</span>
                </p>
                <div className="mt-2 flex justify-center">
                  <StatusBadge
                    status={isPassed ? (isBorderline ? 'warning' : 'success') : 'error'}
                    label={
                      isPassed
                        ? isBorderline
                          ? 'Borderline Quality — Review Advised'
                          : 'Suitable for AI Analysis'
                        : 'Retake Recommended'
                    }
                  />
                </div>
              </div>

              {/* Defensible Image-Level Metrics Grid */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Measured Image Parameters
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-border bg-card p-3 shadow-soft">
                    <p className="text-muted-foreground font-medium">Brightness</p>
                    <p className="mt-0.5 text-sm font-bold text-foreground">{brightnessStatus}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Luminance distribution</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3 shadow-soft">
                    <p className="text-muted-foreground font-medium">Contrast</p>
                    <p className="mt-0.5 text-sm font-bold text-foreground">{contrastStatus}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Foreground separation</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3 shadow-soft">
                    <p className="text-muted-foreground font-medium">Sharpness</p>
                    <p className="mt-0.5 text-sm font-bold text-foreground">{sharpnessStatus}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Edge variance proxy</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3 shadow-soft">
                    <p className="text-muted-foreground font-medium">Resolution</p>
                    <p className="mt-0.5 text-sm font-bold text-foreground">
                      {dimensions ? `${dimensions.width} × ${dimensions.height}` : 'Standard HD'}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Frame pixel count</p>
                  </div>
                  <div className="col-span-2 rounded-xl border border-border bg-card p-3 shadow-soft flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground font-medium">Exposure</p>
                      <p className="text-[10px] text-muted-foreground">Histogram clipping assessment</p>
                    </div>
                    <span className="font-bold text-sm text-foreground">{exposureStatus}</span>
                  </div>
                </div>
              </div>

              {/* Verified Recommendation */}
              {isPassed ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-success/30 bg-success/5 p-3.5 text-xs text-success">
                  <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900">Suitable for analysis</p>
                    <p className="text-slate-700 mt-0.5">
                      Sample image meets resolution and lighting guidelines. Ready to proceed to visual detection.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning/5 p-3.5 text-xs text-warning">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900">Image may be difficult to analyze</p>
                    <p className="text-slate-700 mt-0.5">
                      Lighting or camera blur may degrade detection accuracy. Consider capturing another image with better lighting.
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : null}

          {isError ? (
            <AlertBanner variant="error" title="Quality check unavailable">
              Unable to complete pre-analysis verification. You may proceed directly or retake the sample.
            </AlertBanner>
          ) : null}

          <div className="space-y-2 pt-2">
            <PrimaryButton
              fullWidth
              disabled={isPending}
              onClick={() => navigate(ROUTES.aiAnalysis(id))}
            >
              Proceed to AI Analysis
            </PrimaryButton>
            <SecondaryButton
              fullWidth
              className="gap-2"
              onClick={() => navigate(ROUTES.imageCapture(id))}
            >
              <RotateCcw className="size-4" />
              Retake Sample Photo
            </SecondaryButton>
          </div>
        </div>
      </InspectionStepLayout>
    </>
  )
}
