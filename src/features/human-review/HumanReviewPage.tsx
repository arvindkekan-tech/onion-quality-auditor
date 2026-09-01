import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { InspectionStepLayout } from '@/components/layout/InspectionStepLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  AlertBanner,
  PrimaryButton,
  StatusBadge,
} from '@/components/shared'
import { useSubmitReview } from '@/features/inspections/hooks'
import {
  AI_ADVISORY_NOTE,
  reviewCasesTemplate,
  type ReviewDecision,
} from '@/lib/demo-data'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useInspectionDraftStore } from '@/stores/inspectionDraftStore'

type CaseState = {
  id: string
  decision: ReviewDecision | null
}

export function HumanReviewPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const submitReview = useSubmitReview(id)
  const previewUrl = useInspectionDraftStore((s) => s.previewUrl)
  const [cases, setCases] = useState<CaseState[]>(
    reviewCasesTemplate.map((c) => ({ id: c.id, decision: null })),
  )

  const reviewedCount = cases.filter((c) => c.decision !== null).length
  const allReviewed = reviewedCount === cases.length

  function setDecision(caseId: string, decision: ReviewDecision) {
    setCases((prev) =>
      prev.map((c) => (c.id === caseId ? { ...c, decision } : c)),
    )
  }

  async function handleSubmit() {
    const response = await submitReview.mutateAsync({
      approved: true,
      notes: `Reviewed ${reviewedCount} flagged cases`,
    })
    navigate(ROUTES.certificate(response.certificateId))
  }

  return (
    <>
      <PageHeader
        title="Human Review"
        subtitle="Final inspector classification"
        backTo={ROUTES.inspectionResults(id)}
      />
      <InspectionStepLayout currentStep="review">
        <div className="space-y-4">
          <AlertBanner variant="info" title="Inspector authority">
            {AI_ADVISORY_NOTE}
          </AlertBanner>

          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-soft">
            <span className="text-sm font-medium">Review progress</span>
            <span className="text-sm font-semibold text-primary">
              {reviewedCount} of {cases.length} cases reviewed
            </span>
          </div>

          <div className="space-y-3">
            {reviewCasesTemplate.map((reviewCase, index) => {
              const caseState = cases.find((c) => c.id === reviewCase.id)
              return (
                <div
                  key={reviewCase.id}
                  className="rounded-xl border border-border bg-card p-3 shadow-soft"
                >
                  <div className="flex gap-3">
                    <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt={`${reviewCase.imageLabel} sample region`}
                          className="size-full object-cover"
                          style={{
                            objectPosition: `${20 + index * 15}% ${30 + index * 10}%`,
                          }}
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
                          Sample
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{reviewCase.defect}</p>
                        <StatusBadge
                          status="info"
                          label={`${(reviewCase.confidence * 100).toFixed(0)}%`}
                        />
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {reviewCase.imageLabel}
                      </p>
                      <p className="mt-1 text-xs">{reviewCase.suggestion}</p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {(
                      [
                        { key: 'accept', label: 'Accept AI', color: 'success' },
                        { key: 'override', label: 'Override', color: 'warning' },
                        { key: 'uncertain', label: 'Uncertain', color: 'info' },
                      ] as const
                    ).map((action) => (
                      <button
                        key={action.key}
                        type="button"
                        onClick={() => setDecision(reviewCase.id, action.key)}
                        className={cn(
                          'min-h-10 rounded-lg border text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          caseState?.decision === action.key
                            ? action.key === 'accept'
                              ? 'border-success bg-success/10 text-success'
                              : action.key === 'override'
                                ? 'border-warning bg-accent text-accent-foreground'
                                : 'border-info bg-info/10 text-info'
                            : 'border-border bg-surface-muted text-foreground hover:bg-muted',
                        )}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <PrimaryButton
            fullWidth
            disabled={!allReviewed || submitReview.isPending}
            onClick={handleSubmit}
          >
            {submitReview.isPending
              ? 'Issuing certificate…'
              : 'Approve & Issue Certificate'}
          </PrimaryButton>
        </div>
      </InspectionStepLayout>
    </>
  )
}
