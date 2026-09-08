import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileSearch,
  Phone,
  RotateCcw,
  ShieldCheck,
  AlertCircle,
  Check,
} from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { PrimaryButton, SecondaryButton } from '@/components/shared'
import { useTrackReAuditRequest } from '@/features/inspections/hooks'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { ReAuditTrackingResponse } from '@/types/inspection'

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return dateStr
  }
}

export function ReAuditTrackingPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialId = searchParams.get('id') || ''
  const initialPhone = searchParams.get('phone') || ''

  const [requestId, setRequestId] = useState(initialId)
  const [phoneNumber, setPhoneNumber] = useState(initialPhone)
  const [trackedData, setTrackedData] = useState<ReAuditTrackingResponse | null>(null)
  const [trackError, setTrackError] = useState<string | null>(null)

  const trackMutation = useTrackReAuditRequest()

  // Auto-execute if query params are present on mount
  useEffect(() => {
    if (initialId && initialPhone) {
      handleTrack(initialId, initialPhone)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleTrack(idToTrack: string, phoneToTrack: string) {
    const cleanId = idToTrack.trim()
    const cleanPhone = phoneToTrack.trim()
    if (!cleanId || !cleanPhone) return

    setTrackError(null)
    try {
      const res = await trackMutation.mutateAsync({
        requestId: cleanId,
        phoneNumber: cleanPhone,
      })
      setTrackedData(res)
      // Update URL search params
      setSearchParams({ id: cleanId, phone: cleanPhone })
    } catch (err: unknown) {
      setTrackedData(null)
      const msg =
        err instanceof Error
          ? err.message
          : 'No re-audit request found matching this Request ID and Phone Number.'
      setTrackError(msg)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    handleTrack(requestId, phoneNumber)
  }

  function handleReset() {
    setRequestId('')
    setPhoneNumber('')
    setTrackedData(null)
    setTrackError(null)
    setSearchParams({})
  }

  const isCompleted =
    trackedData?.status?.toUpperCase() === 'COMPLETED' ||
    trackedData?.status?.toUpperCase() === 'ACCEPTED'
  const isInReview = trackedData?.status?.toUpperCase() === 'IN_REVIEW'

  return (
    <>
      <PageHeader
        title="Track Re-audit Request"
        subtitle="Login-free public tracking for independent quality re-audits"
        backTo={ROUTES.welcome}
      />

      <main className="flex flex-1 flex-col gap-4 px-4 py-4 max-w-xl mx-auto w-full">
        {/* Lookup Card (Form) */}
        {!trackedData ? (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-4">
            <div className="text-center">
              <div className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary mb-2">
                <ShieldCheck className="size-6" />
              </div>
              <h1 className="text-base font-bold text-foreground">
                Track Re-audit Status & Response
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-sm mx-auto">
                Enter your Re-audit Request ID and the Phone Number provided during submission to view real-time status and officer findings.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label
                  htmlFor="track-request-id"
                  className="block text-xs font-semibold text-foreground mb-1"
                >
                  Re-audit Request ID *
                </label>
                <div className="relative">
                  <FileSearch className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <input
                    id="track-request-id"
                    type="text"
                    required
                    value={requestId}
                    onChange={(e) => setRequestId(e.target.value)}
                    placeholder="e.g. RA-2026-000001"
                    className="w-full rounded-xl border border-border bg-surface-muted py-2.5 pl-9 pr-3 text-xs font-mono text-foreground placeholder:font-sans outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="track-phone-number"
                  className="block text-xs font-semibold text-foreground mb-1"
                >
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <input
                    id="track-phone-number"
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. 98XXXXXXXX"
                    className="w-full rounded-xl border border-border bg-surface-muted py-2.5 pl-9 pr-3 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Verification factor required to view this request without login.
                </p>
              </div>

              {trackError ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive flex items-start gap-2">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>{trackError}</span>
                </div>
              ) : null}

              <PrimaryButton
                type="submit"
                fullWidth
                disabled={
                  trackMutation.isPending ||
                  !requestId.trim() ||
                  !phoneNumber.trim() ||
                  phoneNumber.trim().replace(/\D/g, '').length < 10
                }
              >
                {trackMutation.isPending ? 'Checking Status…' : 'Track Request'}
              </PrimaryButton>
            </form>

            <div className="pt-2 text-center border-t border-border/60">
              <Link
                to="/verify"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ArrowLeft className="size-3.5" />
                Back to Certificate Verification
              </Link>
            </div>
          </div>
        ) : null}

        {/* Tracking Result View */}
        {trackedData ? (
          <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                Request: <span className="font-mono text-foreground font-bold">{trackedData.id}</span>
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <RotateCcw className="size-3" />
                Track another
              </button>
            </div>

            {/* Status Header Banner */}
            <div
              className={cn(
                'rounded-2xl border p-5 text-center shadow-soft flex flex-col items-center',
                isCompleted
                  ? 'border-emerald-500/30 bg-emerald-50/40 text-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-100'
                  : isInReview
                    ? 'border-blue-500/30 bg-blue-50/40 text-blue-950 dark:bg-blue-950/20 dark:text-blue-100'
                    : 'border-amber-500/30 bg-amber-50/40 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100',
              )}
            >
              <div
                className={cn(
                  'size-12 rounded-full flex items-center justify-center mb-2',
                  isCompleted
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : isInReview
                      ? 'bg-blue-500/10 text-blue-600'
                      : 'bg-amber-500/10 text-amber-600',
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="size-8 text-emerald-600" />
                ) : (
                  <Clock className="size-8" />
                )}
              </div>

              <h2 className="text-base font-bold text-foreground">
                {isCompleted
                  ? 'Re-audit Completed'
                  : isInReview
                    ? 'Re-audit In Review'
                    : 'Independent Quality Re-audit'}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isCompleted
                  ? 'The authorized mandi officer has concluded the re-audit.'
                  : isInReview
                    ? 'The assigned officer has opened and is examining the inspection evidence.'
                    : 'Your request has been registered and is pending officer review.'}
              </p>

              <div className="mt-3 flex items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-bold shadow-2xs',
                    isCompleted
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : isInReview
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
                  )}
                >
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      isCompleted
                        ? 'bg-emerald-600'
                        : isInReview
                          ? 'bg-blue-600 animate-pulse'
                          : 'bg-amber-600 animate-pulse',
                    )}
                  />
                  {isCompleted ? 'Completed' : isInReview ? 'In Review' : 'Pending'}
                </span>
              </div>
            </div>

            {/* Status Timeline */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-soft space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Status Timeline
              </h3>
              <div className="space-y-3 text-xs">
                {/* Step 1: Request Submitted */}
                <div className="flex items-start gap-3">
                  <div className="size-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="size-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="font-semibold text-foreground">Request Submitted</span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDateTime(trackedData.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Dispute registered for Certificate {trackedData.certificateId || 'Lot'}
                    </p>
                  </div>
                </div>

                {/* Step 2: Assigned / In Review */}
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'size-5 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                      isCompleted || isInReview
                        ? 'bg-blue-600 text-white'
                        : 'border-2 border-border bg-surface-muted text-muted-foreground',
                    )}
                  >
                    {isCompleted ? (
                      <Check className="size-3" />
                    ) : isInReview ? (
                      <span className="size-2 rounded-full bg-white animate-pulse" />
                    ) : (
                      <span className="size-1.5 rounded-full bg-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-2">
                      <span
                        className={cn(
                          'font-semibold',
                          isCompleted || isInReview ? 'text-foreground' : 'text-muted-foreground',
                        )}
                      >
                        {isInReview
                          ? 'Re-audit In Review'
                          : isCompleted
                            ? 'Assigned & Reviewed'
                            : 'Awaiting Officer Review'}
                      </span>
                      {(isCompleted || isInReview) && trackedData.inReviewAt ? (
                        <span className="text-[10px] text-muted-foreground">
                          {formatDateTime(trackedData.inReviewAt)}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {isCompleted || isInReview
                        ? `Assigned to ${trackedData.completedBy || trackedData.officerName || 'Authorized Mandi Officer'}`
                        : 'Waiting for authorized officer to examine lot evidence'}
                    </p>
                  </div>
                </div>

                {/* Step 3: Re-audit Response / Completed */}
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'size-5 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                      isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'border-2 border-border bg-surface-muted text-muted-foreground',
                    )}
                  >
                    {isCompleted ? (
                      <Check className="size-3" />
                    ) : (
                      <span className="size-1.5 rounded-full bg-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-2">
                      <span
                        className={cn(
                          'font-semibold',
                          isCompleted ? 'text-foreground' : 'text-muted-foreground',
                        )}
                      >
                        {isCompleted ? 'Re-audit Determination Available' : 'Re-audit Response'}
                      </span>
                      {isCompleted && trackedData.completedAt ? (
                        <span className="text-[10px] text-muted-foreground">
                          {formatDateTime(trackedData.completedAt)}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {isCompleted
                        ? 'Officer has completed documentation and recorded finding'
                        : 'Findings and documented explanation will appear here upon completion'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Completed Determination Section (Visible when Completed) */}
            {isCompleted ? (
              <div className="space-y-4">
                {/* Finding & Grade Summary */}
                <div className="rounded-xl border border-emerald-500/30 bg-card p-4 shadow-soft space-y-3">
                  <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Official Determination
                    </span>
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      {trackedData.finding || 'Original assessment confirmed'}
                    </span>
                  </div>

                  {/* Original vs Re-audit Result */}
                  <div className="rounded-lg bg-surface-muted p-3 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Original Assessment:</span>
                      <span className="font-bold text-foreground">
                        {trackedData.originalGrade || 'Pending'}
                      </span>
                    </div>

                    {trackedData.reAuditGrade &&
                    trackedData.reAuditGrade !== trackedData.originalGrade ? (
                      <div className="flex justify-between items-center border-t border-border/60 pt-1.5">
                        <span className="text-muted-foreground font-semibold">
                          Re-audit Assessment:
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {trackedData.reAuditGrade}
                        </span>
                      </div>
                    ) : (
                      <div className="border-t border-border/60 pt-1.5 text-[11px] text-muted-foreground">
                        ✓ Original assessment confirmed based on reviewed evidence.
                      </div>
                    )}
                  </div>
                </div>

                {/* Evidence Reviewed */}
                <div className="rounded-xl border border-border bg-card p-4 shadow-soft space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Evidence Reviewed
                  </h3>
                  {trackedData.evidenceReviewed && trackedData.evidenceReviewed.length > 0 ? (
                    <ul className="space-y-1.5 text-xs">
                      {trackedData.evidenceReviewed.map((ev, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-foreground font-medium">
                          <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                          <span>{ev}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Original inspection image and grading criteria reviewed.
                    </p>
                  )}
                </div>

                {/* Officer's Explanation */}
                <div className="rounded-xl border border-border bg-card p-4 shadow-soft space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Officer&apos;s Explanation
                  </h3>
                  <div className="rounded-lg bg-surface-muted p-3 text-xs leading-relaxed text-foreground border border-border/50">
                    {trackedData.explanation ? (
                      <p className="whitespace-pre-wrap">{trackedData.explanation}</p>
                    ) : (
                      <p className="italic text-muted-foreground">
                        Assessment verified according to AGMARK/APMC quality specifications.
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                    <span>
                      Officer: <strong className="text-foreground">{trackedData.completedBy || trackedData.officerName || 'Authorized Officer'}</strong>
                    </span>
                    {trackedData.completedAt ? (
                      <span>Completed on {formatDateTime(trackedData.completedAt)}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Farmer's Original Request Section */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-soft space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Your Request
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-border/50 pb-1.5">
                  <span className="text-muted-foreground">Dispute Reason:</span>
                  <span className="font-semibold text-foreground">{trackedData.reasonCategory}</span>
                </div>
                {trackedData.comments ? (
                  <div>
                    <span className="text-muted-foreground block mb-1">Your Remarks:</span>
                    <p className="rounded-lg bg-surface-muted p-2.5 italic text-foreground text-xs leading-relaxed border border-border/40">
                      &ldquo;{trackedData.comments}&rdquo;
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">No additional remarks provided.</p>
                )}
              </div>
            </div>

            {/* Associated Certificate Reference */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-soft space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Associated Certificate:</span>
                {trackedData.certificateId ? (
                  <Link
                    to={`/verify/${trackedData.certificateId}`}
                    className="inline-flex items-center gap-1 font-mono font-bold text-primary hover:underline"
                  >
                    <span>{trackedData.certificateId}</span>
                    <ExternalLink className="size-3" />
                  </Link>
                ) : (
                  <span className="font-mono text-muted-foreground">Lot Certificate</span>
                )}
              </div>
              {trackedData.procurementCentre ? (
                <div className="flex justify-between text-xs border-t border-border/50 pt-1.5">
                  <span className="text-muted-foreground">Procurement Centre:</span>
                  <span className="font-medium text-foreground">{trackedData.procurementCentre}</span>
                </div>
              ) : null}
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex flex-col gap-2">
              <SecondaryButton fullWidth onClick={handleReset}>
                Track Another Request
              </SecondaryButton>
              <Link to="/verify" className="w-full">
                <SecondaryButton fullWidth className="border-border">
                  Back to Certificate Verification
                </SecondaryButton>
              </Link>
            </div>
          </div>
        ) : null}
      </main>
    </>
  )
}
