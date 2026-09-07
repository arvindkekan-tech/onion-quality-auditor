import { useState } from 'react'
import {
  CheckCircle2,
  FileCheck2,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/PageHeader'
import {
  AlertBanner,
  PrimaryButton,
  SecondaryButton,
  StandardsMatrix,
  StatusBadge,
  WhyThisGradeCard,
} from '@/components/shared'
import { useVerifyCertificate } from '@/features/certificates/hooks'
import { useSubmitFarmerReviewRequest } from '@/features/inspections/hooks'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { ReviewRequestResponse } from '@/types/inspection'

const DISPUTE_CATEGORIES = [
  'Grade / Defect Classification Discrepancy',
  'Bulb Size / Caliber Disagreement',
  'Skin Curing & Moisture Re-test',
  'Tray Sampling Representation Dispute',
  'Other General Inquiry / Re-Audit Request',
]

export function QrVerificationPage() {
  const { token = '' } = useParams()
  const verificationQuery = useVerifyCertificate(token)
  const verification = verificationQuery.data
  const cert = verification?.certificate
  const inspectionId = cert?.inspectionId || ''

  const submitReviewRequest = useSubmitFarmerReviewRequest(inspectionId)

  // Review request modal state
  const [showDisputeModal, setShowDisputeModal] = useState(false)
  const [farmerName, setFarmerName] = useState('')
  const [farmerPhone, setFarmerPhone] = useState('')
  const [reasonCategory, setReasonCategory] = useState(DISPUTE_CATEGORIES[0])
  const [farmerComments, setFarmerComments] = useState('')
  const [submissionResult, setSubmissionResult] = useState<ReviewRequestResponse | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function handleDisputeSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!farmerName.trim()) return
    setSubmitError(null)

    try {
      const res = await submitReviewRequest.mutateAsync({
        farmerName: farmerName.trim(),
        phoneNumber: farmerPhone.trim() || undefined,
        reasonCategory,
        comments: farmerComments.trim() || undefined,
      })
      setSubmissionResult(res)
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to submit review request.',
      )
    }
  }

  const transparency = verification?.farmerTransparency as
    | {
        lotId?: string
        inspectionDate?: string
        procurementCentre?: string
        sampleSize?: number
        finalGrade?: string
        aiGrade?: string
        overrideCount?: number
        defectSummary?: string
        verifiedStatus?: string
      }
    | undefined

  const whyThisGradeData = verification?.whyThisGrade || cert?.whyThisGrade
  const standardsMatrixData = verification?.standardsMatrix || cert?.standardsMatrix

  return (
    <>
      <PageHeader
        title="Certificate Verification"
        subtitle="Public authenticity & farmer transparency"
        backTo={ROUTES.dashboard}
      />
      <main className="flex flex-1 flex-col gap-4 px-4 py-4">
        {verificationQuery.isPending ? (
          <p className="text-sm text-muted-foreground">Verifying certificate…</p>
        ) : null}

        {verification ? (
          <>
            <div
              className={cn(
                'flex flex-col items-center rounded-2xl border p-6 text-center shadow-soft',
                verification.valid
                  ? 'border-success/30 bg-success/5'
                  : 'border-destructive/30 bg-destructive/5',
              )}
            >
              {verification.valid ? (
                <CheckCircle2 className="size-12 text-success" aria-hidden />
              ) : (
                <XCircle className="size-12 text-destructive" aria-hidden />
              )}
              <h2 className="mt-3 text-lg font-semibold">
                {verification.valid ? 'Certificate Valid & Authentic' : 'Certificate Invalid'}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {verification.message}
              </p>
              {transparency?.verifiedStatus ? (
                <span className="mt-3 rounded-full border border-success/40 bg-success/10 px-3 py-1 text-xs font-bold text-success">
                  {transparency.verifiedStatus}
                </span>
              ) : null}
            </div>

            {/* Farmer Transparency Summary Card */}
            {cert && verification.valid ? (
              <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" aria-hidden />
                    <span className="text-xs font-semibold text-muted-foreground">
                      Certified Official Grade:
                    </span>
                  </div>
                  <StatusBadge
                    status={
                      cert.grade.toLowerCase().includes('grade a')
                        ? 'grade_a'
                        : cert.grade.toLowerCase().includes('urs')
                          ? 'urs'
                          : 'rejected'
                    }
                    label={cert.grade}
                  />
                </div>
                <dl className="space-y-3 text-sm">
                  <VerifyRow label="Certificate ID" value={cert.id} />
                  <VerifyRow
                    label="Batch ID"
                    value={cert.batchId ?? cert.batchLabel}
                  />
                  <VerifyRow
                    label="Inspection Date"
                    value={new Date(cert.issuedAt).toLocaleString('en-IN')}
                  />
                  <VerifyRow
                    label="Centre"
                    value={cert.procurementCentre ?? '—'}
                  />
                  <VerifyRow
                    label="Specification"
                    value={cert.specification ?? 'APMC Commercial Specification'}
                  />
                  <VerifyRow
                    label="Sample Size"
                    value={
                      cert.sampleSize ? `${cert.sampleSize} onions` : '—'
                    }
                  />
                  <VerifyRow
                    label="AI Confidence"
                    value={
                      cert.confidence
                        ? `${(cert.confidence * 100).toFixed(1)}%`
                        : '—'
                    }
                  />
                  {cert.aiGrade ? (
                    <VerifyRow label="AI Recommended Grade" value={cert.aiGrade} />
                  ) : null}
                  {cert.officerGrade ? (
                    <VerifyRow
                      label="Officer Final Grade"
                      value={cert.officerGrade}
                    />
                  ) : null}
                  {(cert.overrideCount ?? 0) > 0 ? (
                    <VerifyRow
                      label="Audit Trail Decisions"
                      value={`${cert.overrideCount} officer manual decision(s)`}
                    />
                  ) : null}
                </dl>
              </div>
            ) : null}

            {/* Explainable Decision Engine */}
            {whyThisGradeData ? (
              <WhyThisGradeCard data={whyThisGradeData} />
            ) : null}

            {/* Standards-to-Evidence Matrix */}
            {standardsMatrixData && standardsMatrixData.length > 0 ? (
              <StandardsMatrix items={standardsMatrixData} />
            ) : null}

            {/* Farmer Appeal / Review Request Section */}
            {verification.valid && inspectionId ? (
              <section className="rounded-xl border border-border bg-card p-4 shadow-soft space-y-3">
                <div className="flex items-center gap-2">
                  <UserCheck className="size-4 text-primary" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Farmer Transparency & Rights
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Under APMC procurement guidelines, farmers have the right to full inspection evidence and can request an administrative secondary review if they dispute the assigned commercial grade.
                </p>

                {submissionResult ? (
                  <div className="rounded-lg border border-success/30 bg-success/5 p-3 text-xs text-success space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="size-4" />
                      <span>Review Request Registered Successfully</span>
                    </div>
                    <p className="text-[11px]">
                      Ticket Ref: <strong className="font-mono">{submissionResult.id}</strong> • Status: {submissionResult.status.toUpperCase()}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      An APMC nodal officer will verify lot photos and physical samples.
                    </p>
                  </div>
                ) : (
                  <SecondaryButton
                    fullWidth
                    onClick={() => setShowDisputeModal(true)}
                    className="gap-2 text-xs"
                  >
                    <MessageSquare className="size-3.5" />
                    Request Re-Audit / File Review Appeal
                  </SecondaryButton>
                )}
              </section>
            ) : null}

            {/* Audit Timeline */}
            {verification.auditTimeline && verification.auditTimeline.length > 0 ? (
              <section className="rounded-xl border border-border bg-card p-4 shadow-soft">
                <div className="flex items-center gap-2 mb-3">
                  <FileCheck2 className="size-4 text-primary" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Audit Timeline
                  </h3>
                </div>
                <ol className="space-y-3">
                  {verification.auditTimeline.map((event, idx) => (
                    <li key={`${event.event}_${event.time}_${idx}`} className="flex gap-3 text-xs">
                      <div className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                      <div>
                        <p className="font-medium text-foreground">{event.event}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(event.time).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
          </>
        ) : null}

        <Link to={ROUTES.dashboard}>
          <PrimaryButton fullWidth>Back to Dashboard</PrimaryButton>
        </Link>
      </main>

      {/* Farmer Review Request Modal */}
      {showDisputeModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-foreground text-sm">
                  Request Inspection Review / Appeal
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Batch: {cert?.batchLabel || cert?.id} • Grade: {cert?.grade}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDisputeModal(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                aria-label="Close dialog"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleDisputeSubmit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  Farmer / Lot Owner Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patil"
                  value={farmerName}
                  onChange={(e) => setFarmerName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface-muted p-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  Contact Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={farmerPhone}
                  onChange={(e) => setFarmerPhone(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface-muted p-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  Reason for Appeal / Dispute
                </label>
                <select
                  value={reasonCategory}
                  onChange={(e) => setReasonCategory(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface-muted p-2 text-foreground focus:border-primary focus:outline-none"
                >
                  {DISPUTE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  Detailed Remarks
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain why this lot meets Grade A standards or where measurement correction is needed…"
                  value={farmerComments}
                  onChange={(e) => setFarmerComments(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface-muted p-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>

              {submitError ? (
                <AlertBanner variant="error" title="Submission Error">
                  {submitError}
                </AlertBanner>
              ) : null}

              <div className="flex gap-2 pt-2 border-t border-border">
                <SecondaryButton
                  type="button"
                  className="flex-1"
                  onClick={() => setShowDisputeModal(false)}
                >
                  Cancel
                </SecondaryButton>
                <PrimaryButton
                  type="submit"
                  className="flex-1"
                  disabled={submitReviewRequest.isPending}
                >
                  {submitReviewRequest.isPending
                    ? 'Submitting…'
                    : 'Submit Appeal'}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}

function VerifyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  )
}

