import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, AlertTriangle, ArrowRight, Ruler, ShieldCheck } from 'lucide-react'

import { InspectionStepLayout } from '@/components/layout/InspectionStepLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  AlertBanner,
  PrimaryButton,
  ResultCard,
  SecondaryButton,
  StandardsMatrix,
  StatusBadge,
  WhyThisGradeCard,
} from '@/components/shared'
import { useInspectionResults } from '@/features/inspections/hooks'
import {
  labVerificationDefects,
  VISUAL_DISCLAIMER,
} from '@/lib/demo-data'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useInspectionDraftStore } from '@/stores/inspectionDraftStore'

export function InspectionResultsPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const resultsQuery = useInspectionResults(id)
  const previewUrl = useInspectionDraftStore((s) => s.previewUrl)
  const results = resultsQuery.data
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  const hasMultiTray =
    Boolean(results?.imagesResults && results.imagesResults.length > 1)
  const currentImageResult =
    results?.imagesResults?.[selectedImageIndex] ||
    results?.imagesResults?.[0]
  const imageSrc =
    currentImageResult?.annotatedImageUrl ||
    currentImageResult?.url ||
    results?.annotatedImageUrl ||
    previewUrl

  const gradeName = results?.grade || 'Pending'
  const gradeStatus =
    gradeName.toLowerCase().includes('grade a')
      ? 'grade_a'
      : gradeName.toLowerCase().includes('urs')
        ? 'urs'
        : 'rejected'

  const sizeEstimation = results?.sizeEstimation as
    | {
        average_diameter_mm?: number
        minimum_diameter_mm?: number
        maximum_diameter_mm?: number
        sample_count?: number
        calibration?: {
          window_width_mm?: number
          window_height_mm?: number
        }
      }
    | undefined

  return (
    <>
      <PageHeader
        title="Inspection Results"
        subtitle="AI-assisted visual assessment"
        backTo={ROUTES.aiAnalysis(id)}
      />
      <InspectionStepLayout currentStep="results">
        <div className="space-y-4">
          {resultsQuery.isPending ? (
            <p className="text-sm text-muted-foreground">Loading results…</p>
          ) : null}

          {results ? (
            <>
              {/* Commercial Grade Banner */}
              <div
                className={cn(
                  'rounded-xl border p-4 shadow-soft transition-colors',
                  gradeName === 'Grade A'
                    ? 'border-success/30 bg-success/5'
                    : gradeName === 'URS'
                      ? 'border-warning/30 bg-accent'
                      : gradeName === 'Rejected'
                        ? 'border-destructive/30 bg-destructive/5'
                        : 'border-border bg-surface-muted',
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Commercial Grade (MVP Thresholds)
                    </p>
                    <p className="mt-0.5 text-2xl font-extrabold text-foreground">
                      {gradeName}
                    </p>
                  </div>
                  <StatusBadge status={gradeStatus} label={gradeName} />
                </div>
                {results.gradeExplanation ? (
                  <p className="mt-2.5 border-t border-border/60 pt-2 text-xs text-muted-foreground">
                    {results.gradeExplanation}
                  </p>
                ) : null}
              </div>

              {/* Explainable AI Decision Engine */}
              {results.whyThisGrade ? (
                <WhyThisGradeCard data={results.whyThisGrade} />
              ) : null}

              {/* Zero Detections Alert */}
              {results.totalOnions === 0 ? (
                <AlertBanner variant="error" title="Zero Onions Detected">
                  The detection model did not find any onions in this image. Please retake the photo ensuring clear contrast and no excessive glare.
                </AlertBanner>
              ) : null}

              {/* AI Attention Queue */}
              {results.attentionQueue && results.attentionQueue.length > 0 ? (
                <section className="space-y-2 rounded-xl border border-warning/30 bg-warning/5 p-4 shadow-soft">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="size-4 text-warning" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        AI Attention Queue ({results.attentionQueue.length})
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(ROUTES.humanReview(id))}
                      className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      Audit in Review
                      <ArrowRight className="size-3" />
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Bulbs requiring inspector attention due to defect uncertainty, borderline size, or anomalous variance.
                  </p>
                  <div className="space-y-2 pt-1">
                    {results.attentionQueue.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-border bg-card p-2.5 text-xs shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">{item.title}</span>
                          <span
                            className={cn(
                              'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
                              item.severity === 'high'
                                ? 'bg-destructive/10 text-destructive'
                                : item.severity === 'medium'
                                  ? 'bg-warning/10 text-warning'
                                  : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {item.severity} priority
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">{item.reason}</p>
                        <p className="mt-1 text-[10px] font-medium text-primary">
                          Action: {item.recommendation}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              ) : results.attentionRequired ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-accent p-3 text-xs text-warning-foreground">
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
                  <div>
                    <p className="font-semibold">Inspector Attention Required</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {results.attentionReason || 'High defect percentage or detection uncertainty flagged.'}
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Summary Metrics */}
              <div className="grid grid-cols-4 gap-2">
                <ResultCard
                  label="Total"
                  value={results.totalOnions ?? '—'}
                />
                <ResultCard
                  label="Healthy"
                  value={results.healthyCount ?? '—'}
                />
                <ResultCard
                  label="Defects"
                  value={(results.rottenDamagedCount ?? 0) + (results.sproutedCount ?? 0)}
                />
                <ResultCard
                  label="Confidence"
                  value={`${((results.confidence ?? 0) * 100).toFixed(0)}%`}
                />
              </div>

              {/* Annotated Image Visualization & Multi-tray Switcher */}
              <div className="space-y-2">
                {hasMultiTray ? (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {results.imagesResults?.map((imgRes, idx) => (
                      <button
                        key={imgRes.imageId || idx}
                        type="button"
                        onClick={() => setSelectedImageIndex(idx)}
                        className={cn(
                          'shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                          selectedImageIndex === idx
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'border border-border bg-surface-muted text-muted-foreground hover:bg-muted',
                        )}
                      >
                        Tray {idx + 1} ({imgRes.totalOnions} bulbs
                        {(imgRes.rottenDamagedCount + imgRes.sproutedCount) > 0
                          ? ` • ${imgRes.rottenDamagedCount + imgRes.sproutedCount} defect${(imgRes.rottenDamagedCount + imgRes.sproutedCount) > 1 ? 's' : ''}`
                          : ''}
                        )
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
                  <div className="relative">
                    {imageSrc ? (
                      <img
                        src={imageSrc}
                        alt="Annotated onion sample visualization"
                        className="aspect-[4/3] w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-[4/3] items-center justify-center bg-surface-muted text-sm text-muted-foreground">
                        Sample visualization
                      </div>
                    )}
                    {results.annotatedImageUrl || currentImageResult?.annotatedImageUrl ? (
                      <div className="absolute bottom-2 left-2 rounded bg-black/75 px-2 py-1 text-[10px] font-medium text-white backdrop-blur">
                        YOLO Overlays Active
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
                    <span>
                      {hasMultiTray
                        ? `Tray ${selectedImageIndex + 1} of ${results.imagesResults?.length} (${currentImageResult?.totalOnions ?? 0} bulbs)`
                        : `Model: ${results.modelName ?? 'YOLO Detection + Classification'}`}
                    </span>
                    <span>{results.totalOnions ?? 0} total bulbs analyzed</span>
                  </div>
                </div>
              </div>

              {/* Physical Size Estimation */}
              {sizeEstimation && sizeEstimation.average_diameter_mm ? (
                <section className="space-y-2 rounded-xl border border-border bg-card p-3 shadow-soft">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Ruler className="size-3.5" />
                      <span>Physical Size Estimation</span>
                    </div>
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      Calibrated Window
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="rounded-lg bg-surface-muted p-2">
                      <p className="text-[10px] text-muted-foreground">Avg Diameter</p>
                      <p className="text-sm font-bold text-foreground">
                        {sizeEstimation.average_diameter_mm} mm
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-muted p-2">
                      <p className="text-[10px] text-muted-foreground">Min Diameter</p>
                      <p className="text-sm font-bold text-foreground">
                        {sizeEstimation.minimum_diameter_mm} mm
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-muted p-2">
                      <p className="text-[10px] text-muted-foreground">Max Diameter</p>
                      <p className="text-sm font-bold text-foreground">
                        {sizeEstimation.maximum_diameter_mm} mm
                      </p>
                    </div>
                  </div>
                  {sizeEstimation.calibration?.window_width_mm ? (
                    <p className="text-[10px] text-muted-foreground">
                      Calibration: {sizeEstimation.calibration.window_width_mm}mm × {sizeEstimation.calibration.window_height_mm}mm reference grid
                    </p>
                  ) : null}
                </section>
              ) : null}

              <p className="text-sm text-muted-foreground">{results.summary}</p>

              {/* Visually Assessable Defects */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Visually Assessable
                </h3>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-success" />
                      Healthy Onions
                    </span>
                    <span className="font-semibold tabular-nums text-success">
                      {results.healthyCount ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-destructive" />
                      Rotten / Damaged
                    </span>
                    <span className="font-semibold tabular-nums text-destructive">
                      {results.rottenDamagedCount ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-amber-500" />
                      Sprouted
                    </span>
                    <span className="font-semibold tabular-nums text-warning">
                      {results.sproutedCount ?? 0}
                    </span>
                  </div>
                  {typeof results.uncertainCount === 'number' && results.uncertainCount > 0 ? (
                    <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-blue-500" />
                        Uncertain / Low Confidence
                      </span>
                      <span className="font-semibold tabular-nums text-muted-foreground">
                        {results.uncertainCount}
                      </span>
                    </div>
                  ) : null}
                </div>
              </section>

              {/* Standards-to-Evidence Verification Matrix */}
              {results.standardsMatrix && results.standardsMatrix.length > 0 ? (
                <StandardsMatrix items={results.standardsMatrix} />
              ) : (
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Requires Physical / Lab Verification
                  </h3>
                  <div className="space-y-1.5">
                    {labVerificationDefects.map((defect) => (
                      <div
                        key={defect}
                        className="flex items-center justify-between rounded-lg border border-dashed border-border bg-surface-muted px-3 py-2 text-sm text-muted-foreground"
                      >
                        <span>{defect}</span>
                        <span className="text-xs">Lab only</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <AlertBanner variant="info">{VISUAL_DISCLAIMER}</AlertBanner>
            </>
          ) : null}

          {resultsQuery.isError ? (
            <AlertBanner variant="error" title="Results unavailable">
              Complete AI analysis before viewing results.
            </AlertBanner>
          ) : null}

          {isAuthenticated ? (
            <div className="space-y-2 pt-2">
              <PrimaryButton
                fullWidth
                disabled={!results}
                onClick={() => navigate(ROUTES.humanReview(id))}
              >
                Continue to Official Human Review
              </PrimaryButton>
              <SecondaryButton
                fullWidth
                onClick={() => navigate(ROUTES.newInspection)}
              >
                Start Another Inspection
              </SecondaryButton>
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4 pt-3">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="size-5 text-primary shrink-0 mt-0.5" />
                <div className="text-xs text-slate-700">
                  <p className="font-bold text-slate-900 mb-1">Official Mandi Certification</p>
                  <p>
                    AI quality assessment complete. To apply official overrides, confirm physical grading, and issue an official APMC quality certificate, sign in with an authorized officer account.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <PrimaryButton
                  fullWidth
                  disabled={!results}
                  onClick={() =>
                    navigate('/login', {
                      state: {
                        from: { pathname: ROUTES.humanReview(id) },
                        message:
                          'Official APMC Officer sign-in is required to review lots and issue certified quality certificates.',
                      },
                    })
                  }
                >
                  Officer Sign In for Review & Certificate
                </PrimaryButton>
                <SecondaryButton
                  fullWidth
                  onClick={() => navigate(ROUTES.newInspection)}
                >
                  Start Another Quick Inspection
                </SecondaryButton>
              </div>
            </div>
          )}
        </div>
      </InspectionStepLayout>
    </>
  )
}
