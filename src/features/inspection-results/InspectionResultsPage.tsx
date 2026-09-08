import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  Ruler,
  Sparkles,
} from 'lucide-react'

import { InspectionStepLayout } from '@/components/layout/InspectionStepLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  AlertBanner,
  PrimaryButton,
  SecondaryButton,
  StandardsMatrix,
  StatusBadge,
  WhyThisGradeCard,
} from '@/components/shared'
import { useInspectionResults } from '@/features/inspections/hooks'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useInspectionDraftStore } from '@/stores/inspectionDraftStore'

export function InspectionResultsPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const resultsQuery = useInspectionResults(id)
  const previewUrl = useInspectionDraftStore((s) => s.previewUrl)
  const metadata = useInspectionDraftStore((s) => s.metadata)
  const results = resultsQuery.data
  const user = useAuthStore((s) => s.user)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isWhyGradeExpanded, setIsWhyGradeExpanded] = useState(false)
  const [isStandardsExpanded, setIsStandardsExpanded] = useState(false)

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

  const totalBulbs = results?.totalOnions ?? 0
  const healthyCount = results?.healthyCount ?? 0
  const rottenDamagedCount = results?.rottenDamagedCount ?? 0
  const sproutedCount = results?.sproutedCount ?? 0
  const uncertainCount = results?.uncertainCount ?? 0
  const defectCount = rottenDamagedCount + sproutedCount
  const defectRatio = totalBulbs > 0 ? (defectCount / totalBulbs) * 100 : 0

  // Quality Composition (SIH Problem Statement Compliance)
  const undersizedDefect = results?.defects?.find((d) =>
    d.label.toLowerCase().includes('undersized')
  )
  const undersizedCount =
    results?.qualityComposition?.undersizedCount !== undefined
      ? results.qualityComposition.undersizedCount
      : undersizedDefect
        ? undersizedDefect.count
        : null

  const gradeAPct =
    results?.qualityComposition?.gradeAPercent !== undefined
      ? `${results.qualityComposition.gradeAPercent}%`
      : totalBulbs > 0
        ? `${((healthyCount / totalBulbs) * 100).toFixed(1)}%`
        : 'Not available'

  const ursPct =
    results?.qualityComposition?.ursPercent !== undefined
      ? `${results.qualityComposition.ursPercent}%`
      : totalBulbs > 0
        ? `${((defectCount / totalBulbs) * 100).toFixed(1)}%`
        : 'Not available'

  const undersizedDisplay =
    undersizedCount !== null && undersizedCount !== undefined
      ? String(undersizedCount)
      : 'Not available'

  const rottenDamagedDisplay = String(rottenDamagedCount)
  const sproutedDisplay = String(sproutedCount)

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

  const inspectionDate = results?.analyzedAt
    ? new Date(results.analyzedAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Recent analysis'

  const officerName = metadata.inspector || user?.name || 'Authorized Officer'

  return (
    <>
      <PageHeader
        title="Inspection Result"
        subtitle={`Lot ${metadata.batchId || id.slice(0, 8)} • AI-assisted visual assessment`}
        backTo={ROUTES.aiAnalysis(id)}
      />
      <InspectionStepLayout currentStep="results">
        <div className="space-y-4">
          {resultsQuery.isPending ? (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Loading inspection evidence…
            </div>
          ) : null}

          {results ? (
            <>
              {/* Inspection Meta Top Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface-muted px-3.5 py-2.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">ID:</span>
                  <span className="font-mono text-xs">{id.slice(0, 10)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  <span>{inspectionDate}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground">Officer:</span>
                  <span>{officerName}</span>
                </div>
              </div>

              {/* Commercial Grade Summary Card */}
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
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Commercial Grade
                    </span>
                    <h2 className="mt-0.5 text-3xl font-extrabold text-foreground">
                      {gradeName}
                    </h2>
                    <p className="mt-1 text-xs font-semibold text-slate-700">
                      Defect ratio: {defectRatio.toFixed(1)}%
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Based on configured decision thresholds and visual sample evidence.
                    </p>
                  </div>
                  <StatusBadge status={gradeStatus} label={gradeName} />
                </div>
              </div>

              {/* Quality Composition / Breakdown (SIH PS Compliance) */}
              <section className="space-y-2 rounded-xl border border-border bg-card p-4 shadow-soft">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <Layers className="size-3.5 text-primary" />
                    <span>Quality Composition</span>
                  </div>
                  <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-2 py-0.5 text-[10px] font-semibold">
                    PS Grade &amp; Defect Breakdown
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-center">
                  <div className="rounded-lg bg-surface-muted p-2.5 border border-border/50">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Grade A
                    </p>
                    <p className="text-base font-extrabold text-emerald-700 mt-0.5">
                      {gradeAPct}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {healthyCount} sound bulb{healthyCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-surface-muted p-2.5 border border-border/50">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      URS
                    </p>
                    <p className="text-base font-extrabold text-amber-700 mt-0.5">
                      {ursPct}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {defectCount} re-sort bulb{defectCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-surface-muted p-2.5 border border-border/50">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Undersized
                    </p>
                    <p className="text-base font-bold text-foreground mt-0.5">
                      {undersizedDisplay}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      &lt; 40mm caliber
                    </p>
                  </div>
                  <div className="rounded-lg bg-surface-muted p-2.5 border border-border/50">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Rotten / Damaged
                    </p>
                    <p className="text-base font-bold text-rose-700 mt-0.5">
                      {rottenDamagedDisplay}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Physical decay
                    </p>
                  </div>
                  <div className="rounded-lg bg-surface-muted p-2.5 border border-border/50 col-span-2 sm:col-span-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Sprouted
                    </p>
                    <p className="text-base font-bold text-amber-600 mt-0.5">
                      {sproutedDisplay}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Vegetative shoots
                    </p>
                  </div>
                </div>
              </section>

              {/* Expandable "Why This Grade?" Decision Evidence Card */}
              {results.whyThisGrade ? (
                <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setIsWhyGradeExpanded(!isWhyGradeExpanded)}
                    className="flex w-full items-center justify-between p-3.5 text-left text-xs font-semibold transition-colors hover:bg-surface-muted"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 text-primary" />
                      <div>
                        <span className="text-foreground">Why this grade?</span>
                        <p className="text-[11px] font-normal text-muted-foreground">
                          {isWhyGradeExpanded
                            ? 'Hide quantitative evidence'
                            : 'View decision evidence and tolerance breakdown'}
                        </p>
                      </div>
                    </div>
                    {isWhyGradeExpanded ? (
                      <ChevronUp className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                  </button>
                  {isWhyGradeExpanded ? (
                    <div className="border-t border-border p-3 pt-2">
                      <WhyThisGradeCard data={results.whyThisGrade} compact />
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Zero Detections Alert */}
              {totalBulbs === 0 ? (
                <AlertBanner variant="error" title="Zero Onions Detected">
                  The detection model did not find any onions in this image. Please retake the photo ensuring clear contrast and no excessive glare.
                </AlertBanner>
              ) : null}

              {/* Review Required (AI Attention Queue) */}
              {results.attentionQueue && results.attentionQueue.length > 0 ? (
                <section className="flex items-center justify-between rounded-xl border border-warning/30 bg-warning/5 p-3.5 text-xs shadow-soft">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="size-4 text-warning shrink-0" />
                    <div>
                      <h3 className="font-bold text-slate-900">Review Required</h3>
                      <p className="text-slate-700 text-[11px]">
                        {results.attentionQueue.length} observation
                        {results.attentionQueue.length > 1 ? 's need' : ' needs'} officer attention.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(ROUTES.humanReview(id))}
                    className="flex items-center gap-1 rounded-lg bg-warning/20 px-2.5 py-1 text-xs font-bold text-warning-foreground hover:bg-warning/30 transition-colors"
                  >
                    Review
                    <ArrowRight className="size-3" />
                  </button>
                </section>
              ) : null}

              {/* Visually Assessable Findings Breakdown */}
              <section className="space-y-2 rounded-xl border border-border bg-card p-4 shadow-soft">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Visual Findings
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    {totalBulbs} Total Bulbs
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/60 text-muted-foreground text-[11px]">
                        <th className="py-1 text-left font-medium">Finding</th>
                        <th className="py-1 text-right font-medium">Count</th>
                        <th className="py-1 text-right font-medium">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      <tr>
                        <td className="py-2 flex items-center gap-2">
                          <span className="size-2 rounded-full bg-success" />
                          <span className="font-medium text-foreground">Healthy</span>
                        </td>
                        <td className="py-2 text-right font-semibold tabular-nums text-success">
                          {healthyCount}
                        </td>
                        <td className="py-2 text-right font-medium tabular-nums text-muted-foreground">
                          {totalBulbs > 0 ? ((healthyCount / totalBulbs) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 flex items-center gap-2">
                          <span className="size-2 rounded-full bg-destructive" />
                          <span className="font-medium text-foreground">Rotten / Damaged</span>
                        </td>
                        <td className="py-2 text-right font-semibold tabular-nums text-destructive">
                          {rottenDamagedCount}
                        </td>
                        <td className="py-2 text-right font-medium tabular-nums text-muted-foreground">
                          {totalBulbs > 0 ? ((rottenDamagedCount / totalBulbs) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 flex items-center gap-2">
                          <span className="size-2 rounded-full bg-amber-500" />
                          <span className="font-medium text-foreground">Sprouted</span>
                        </td>
                        <td className="py-2 text-right font-semibold tabular-nums text-warning">
                          {sproutedCount}
                        </td>
                        <td className="py-2 text-right font-medium tabular-nums text-muted-foreground">
                          {totalBulbs > 0 ? ((sproutedCount / totalBulbs) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                      {uncertainCount > 0 ? (
                        <tr>
                          <td className="py-2 flex items-center gap-2">
                            <span className="size-2 rounded-full bg-blue-500" />
                            <span className="font-medium text-foreground">Uncertain / Low Confidence</span>
                          </td>
                          <td className="py-2 text-right font-semibold tabular-nums text-muted-foreground">
                            {uncertainCount}
                          </td>
                          <td className="py-2 text-right font-medium tabular-nums text-muted-foreground">
                            {totalBulbs > 0 ? ((uncertainCount / totalBulbs) * 100).toFixed(1) : 0}%
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Physical Size Estimation */}
              <section className="space-y-2 rounded-xl border border-border bg-card p-4 shadow-soft">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <Ruler className="size-3.5" />
                    <span>Physical Size</span>
                  </div>
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {sizeEstimation?.average_diameter_mm
                      ? 'Estimated from image calibration'
                      : 'Unavailable'}
                  </span>
                </div>

                {sizeEstimation && sizeEstimation.average_diameter_mm ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 pt-1 text-center">
                      <div className="rounded-lg bg-surface-muted p-2.5">
                        <p className="text-[10px] text-muted-foreground">Average diameter</p>
                        <p className="text-base font-bold text-foreground">
                          {sizeEstimation.average_diameter_mm} mm
                        </p>
                      </div>
                      <div className="rounded-lg bg-surface-muted p-2.5">
                        <p className="text-[10px] text-muted-foreground">Range</p>
                        <p className="text-base font-bold text-foreground">
                          {sizeEstimation.minimum_diameter_mm ?? '—'} – {sizeEstimation.maximum_diameter_mm ?? '—'} mm
                        </p>
                      </div>
                    </div>
                    {sizeEstimation.calibration?.window_width_mm ? (
                      <p className="text-[10px] text-muted-foreground text-center">
                        Calibration: {sizeEstimation.calibration.window_width_mm}mm × {sizeEstimation.calibration.window_height_mm}mm reference grid
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-1">
                    Physical size estimation unavailable for this inspection.
                  </p>
                )}
              </section>

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
                        Tray {idx + 1} ({imgRes.totalOnions} bulbs)
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
                        YOLO Detections Overlaid
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
                    <span>
                      {hasMultiTray
                        ? `Tray ${selectedImageIndex + 1} of ${results.imagesResults?.length}`
                        : `Model: ${results.modelName ?? 'YOLO Detection + Classification'}`}
                    </span>
                    <span>Confidence: {((results.confidence ?? 0) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              {/* Standards-to-Evidence Matrix Behind Accordion */}
              {results.standardsMatrix && results.standardsMatrix.length > 0 ? (
                <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setIsStandardsExpanded(!isStandardsExpanded)}
                    className="flex w-full items-center justify-between p-3.5 text-left text-xs font-semibold transition-colors hover:bg-surface-muted"
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="size-4 text-primary" />
                      <div>
                        <span className="text-foreground">Standards & Evidence</span>
                        <p className="text-[11px] font-normal text-muted-foreground">
                          {isStandardsExpanded ? 'Hide criteria matrix' : 'View evidence matrix (7 parameters)'}
                        </p>
                      </div>
                    </div>
                    {isStandardsExpanded ? (
                      <ChevronUp className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                  </button>
                  {isStandardsExpanded ? (
                    <div className="border-t border-border p-3 pt-2">
                      <StandardsMatrix items={results.standardsMatrix} />
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Subtle AI Disclosure / Trust Card */}
              <div className="flex items-start gap-2.5 rounded-xl border border-border bg-surface-muted p-3.5 text-xs text-muted-foreground">
                <Info className="size-4 shrink-0 text-primary mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">AI-assisted assessment</p>
                  <p className="mt-0.5">
                    ONIVIS provides visual evidence and analysis to support inspection. The final inspection decision remains with the authorized officer.
                  </p>
                </div>
              </div>
            </>
          ) : null}

          {resultsQuery.isError ? (
            <AlertBanner variant="error" title="Results unavailable">
              Complete AI analysis before viewing results.
            </AlertBanner>
          ) : null}

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
        </div>
      </InspectionStepLayout>
    </>
  )
}
