import { CheckCircle2, ShieldCheck, XCircle } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/PageHeader'
import { PrimaryButton, StatusBadge } from '@/components/shared'
import { useVerifyCertificate } from '@/features/certificates/hooks'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'

export function QrVerificationPage() {
  const { token = '' } = useParams()
  const verificationQuery = useVerifyCertificate(token)
  const verification = verificationQuery.data
  const cert = verification?.certificate

  return (
    <>
      <PageHeader
        title="Certificate Verification"
        subtitle="Public authenticity check"
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
                'flex flex-col items-center rounded-2xl border p-6 text-center',
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
                {verification.valid ? 'Certificate Valid' : 'Certificate Invalid'}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {verification.message}
              </p>
            </div>

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
                    value={cert.specification ?? '—'}
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
                      label="Manual Overrides"
                      value={`${cert.overrideCount} verified in audit trail`}
                    />
                  ) : null}
                </dl>
              </div>
            ) : null}

            {verification.auditTimeline && verification.auditTimeline.length > 0 ? (
              <section className="rounded-xl border border-border bg-card p-4 shadow-soft">
                <h3 className="text-sm font-semibold">Audit Timeline</h3>
                <ol className="mt-3 space-y-3">
                  {verification.auditTimeline.map((event, idx) => (
                    <li key={`${event.event}_${event.time}_${idx}`} className="flex gap-3 text-sm">
                      <div className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                      <div>
                        <p className="font-medium">{event.event}</p>
                        <p className="text-xs text-muted-foreground">
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
