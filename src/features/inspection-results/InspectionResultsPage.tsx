import { useNavigate, useParams } from 'react-router-dom'

import { InspectionStepLayout } from '@/components/layout/InspectionStepLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  AlertBanner,
  PrimaryButton,
  ResultCard,
  StatusBadge,
} from '@/components/shared'
import { useInspectionResults } from '@/features/inspections/hooks'
import {
  labVerificationDefects,
  MODEL_NAME,
  VISUAL_DISCLAIMER,
  visuallyAssessableDefects,
} from '@/lib/demo-data'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useInspectionDraftStore } from '@/stores/inspectionDraftStore'

export function InspectionResultsPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const resultsQuery = useInspectionResults(id)
  const previewUrl = useInspectionDraftStore((s) => s.previewUrl)
  const results = resultsQuery.data

  const classification = results?.classification ?? 'grade_a'
  const gradeLabels = {
    grade_a: 'Grade A',
    urs: 'URS',
    rejected: 'Rejected',
  } as const

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
              <div className="flex gap-2">
                {(['grade_a', 'urs', 'rejected'] as const).map((grade) => (
                  <div
                    key={grade}
                    className={cn(
                      'flex-1 rounded-xl border p-3 text-center transition-colors',
                      classification === grade
                        ? grade === 'grade_a'
                          ? 'border-success bg-success/10'
                          : grade === 'urs'
                            ? 'border-warning bg-accent'
                            : 'border-destructive bg-destructive/10'
                        : 'border-border bg-surface-muted opacity-50',
                    )}
                  >
                    <p className="text-xs font-medium text-muted-foreground">
                      {gradeLabels[grade]}
                    </p>
                    {classification === grade ? (
                      <StatusBadge
                        status={
                          grade === 'grade_a'
                            ? 'grade_a'
                            : grade === 'urs'
                              ? 'urs'
                              : 'rejected'
                        }
                        className="mt-1"
                      />
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <ResultCard
                  label="Total Onions"
                  value={results.totalOnions ?? 48}
                />
                <ResultCard
                  label="AI Confidence"
                  value={`${(results.confidence * 100).toFixed(0)}%`}
                />
                <ResultCard
                  label="Model"
                  value={results.modelName ?? MODEL_NAME}
                  sublabel="v2024.3"
                />
              </div>

              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
                <div className="relative">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Annotated sample visualization"
                      className="aspect-[4/3] w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-surface-muted text-sm text-muted-foreground">
                      Sample visualization
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0">
                    <span className="absolute left-[20%] top-[30%] size-8 rounded-full border-2 border-success bg-success/20" />
                    <span className="absolute left-[55%] top-[45%] size-6 rounded-full border-2 border-warning bg-warning/20" />
                    <span className="absolute left-[35%] top-[60%] size-7 rounded-full border-2 border-destructive bg-destructive/20" />
                  </div>
                </div>
                <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                  Detected regions highlighted for inspector review
                </p>
              </div>

              <p className="text-sm text-muted-foreground">{results.summary}</p>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Visually Assessable
                </h3>
                <div className="space-y-1.5">
                  {(results.defects.length > 0
                    ? results.defects.filter((d) => d.category !== 'lab')
                    : visuallyAssessableDefects.map((label) => ({
                        label,
                        count: 0,
                      }))
                  ).map((defect) => (
                    <div
                      key={defect.label}
                      className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm"
                    >
                      <span>{defect.label}</span>
                      <span className="font-semibold tabular-nums">
                        {defect.count}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

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

              <AlertBanner variant="info">{VISUAL_DISCLAIMER}</AlertBanner>
            </>
          ) : null}

          {resultsQuery.isError ? (
            <AlertBanner variant="error" title="Results unavailable">
              Complete AI analysis before viewing results.
            </AlertBanner>
          ) : null}

          <PrimaryButton
            fullWidth
            disabled={!results}
            onClick={() => navigate(ROUTES.humanReview(id))}
          >
            Continue to Human Review
          </PrimaryButton>
        </div>
      </InspectionStepLayout>
    </>
  )
}
