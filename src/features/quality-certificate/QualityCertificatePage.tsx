import { Download, Share2, ShieldCheck } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/PageHeader'
import { PrimaryButton, QrCodeView, SecondaryButton, StatusBadge } from '@/components/shared'
import { useCertificate } from '@/features/certificates/hooks'
import { getCertificatePdfUrl } from '@/lib/api/certificates'
import { APP_NAME } from '@/lib/demo-data'
import { ROUTES } from '@/lib/constants'

export function QualityCertificatePage() {
  const { id = '' } = useParams()
  const certificateQuery = useCertificate(id)
  const certificate = certificateQuery.data

  const verifyUrl = certificate
    ? `${window.location.origin}${ROUTES.verify(certificate.qrToken)}`
    : ''

  const statusBadgeType =
    certificate?.grade.toLowerCase().includes('grade a')
      ? 'grade_a'
      : certificate?.grade.toLowerCase().includes('urs')
        ? 'urs'
        : 'rejected'

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title="Digital Certificate"
          subtitle="Official quality record"
          backTo={ROUTES.dashboard}
        />
      </div>
      <main className="flex flex-1 flex-col gap-4 px-4 py-4 print:p-0">
        {certificateQuery.isPending ? (
          <p className="text-sm text-muted-foreground">Loading certificate…</p>
        ) : null}

        {certificate ? (
          <div className="overflow-hidden rounded-2xl border-2 border-primary/20 bg-card shadow-card print:border-none print:shadow-none">
            <div className="bg-primary px-4 py-5 text-primary-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5" aria-hidden />
                <span className="text-sm font-bold tracking-wide">{APP_NAME}</span>
              </div>
              <h2 className="mt-2 text-lg font-semibold">
                Digital Quality Certificate
              </h2>
              <p className="mt-1 text-xs opacity-80">
                Agricultural Procurement Quality System
              </p>
            </div>

            <div className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <StatusBadge status={statusBadgeType} label={certificate.grade} />
                <span className="text-xs text-muted-foreground">
                  {new Date(certificate.issuedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>

              <div className="grid gap-3 text-sm">
                <CertRow label="Certificate ID" value={certificate.id} />
                <CertRow
                  label="Batch ID"
                  value={certificate.batchId ?? certificate.batchLabel}
                />
                <CertRow
                  label="Procurement Centre"
                  value={certificate.procurementCentre ?? '—'}
                />
                <CertRow
                  label="Specification"
                  value={certificate.specification ?? '—'}
                />
                <CertRow
                  label="Sample Size"
                  value={
                    certificate.sampleSize
                      ? `${certificate.sampleSize} onions`
                      : '—'
                  }
                />
                <CertRow
                  label="AI Confidence"
                  value={
                    certificate.confidence
                      ? `${(certificate.confidence * 100).toFixed(1)}%`
                      : '—'
                  }
                />
                <CertRow
                  label="Inspector"
                  value={certificate.inspectorName ?? '—'}
                />
              </div>

              {certificate.defectSummary ? (
                <div className="rounded-lg border border-border bg-surface-muted p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Defect Summary
                  </p>
                  <p className="mt-1 text-sm">{certificate.defectSummary}</p>
                </div>
              ) : null}

              {/* Dual Assessment Track */}
              <div className="space-y-2 rounded-xl border border-border bg-surface-muted p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    Quality Assessment Tracks
                  </span>
                  {(certificate.overrideCount ?? 0) > 0 ? (
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {certificate.overrideCount} Override(s) Audited
                    </span>
                  ) : (
                    <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Concurred with AI
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-border bg-card p-2.5">
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      AI Baseline
                    </span>
                    <p className="mt-0.5 font-bold text-foreground">
                      {certificate.aiGrade || certificate.grade}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Confidence:{' '}
                      {certificate.confidence
                        ? `${(certificate.confidence * 100).toFixed(1)}%`
                        : '—'}
                    </p>
                  </div>
                  <div className="rounded-lg border-2 border-primary/40 bg-card p-2.5">
                    <span className="text-[10px] font-bold text-primary">
                      Officer Final (Certified)
                    </span>
                    <p className="mt-0.5 font-extrabold text-foreground">
                      {certificate.officerGrade || certificate.grade}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Inspector:{' '}
                      {certificate.inspectorName ?? 'Authorized Officer'}
                    </p>
                  </div>
                </div>
                {(certificate.overrideCount ?? 0) > 0 ? (
                  <p className="text-[11px] italic text-primary/90">
                    Official grade reflects authorized officer inspection overrides logged in audit record.
                  </p>
                ) : null}
              </div>

              {/* Public Verification Section */}
              <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-surface-muted py-5 px-4 text-center space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Verify this certificate
                </span>
                <QrCodeView
                  value={verifyUrl}
                  size={150}
                  alt={`QR Code for Certificate ${certificate.id}`}
                />
                <p className="text-xs font-semibold text-foreground">
                  Scan QR code
                </p>
                <p className="text-[11px] text-muted-foreground max-w-xs">
                  Anyone with this certificate can verify its authenticity without an ONIVIS account.
                </p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  Verification Token: {certificate.qrToken}
                </p>
              </div>

              <div className="space-y-2 print:hidden">
                <a
                  href={getCertificatePdfUrl(certificate.id)}
                  download={`ONIVIS-Certificate-${certificate.id}.pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full"
                >
                  <PrimaryButton fullWidth className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white">
                    <Download className="size-4" aria-hidden />
                    Download PDF Certificate
                  </PrimaryButton>
                </a>
                <div className="grid grid-cols-2 gap-2">
                  <SecondaryButton
                    className="gap-2 text-xs"
                    onClick={() => {
                      if (navigator.share) {
                        void navigator.share({
                          title: `ONIVIS Certificate ${certificate.id}`,
                          text: `Verify ONIVIS Digital Quality Record for lot ${certificate.batchId || certificate.id}`,
                          url: verifyUrl,
                        }).catch(() => {})
                      } else {
                        void navigator.clipboard.writeText(verifyUrl)
                        alert('Certificate verification link copied to clipboard!')
                      }
                    }}
                  >
                    <Share2 className="size-3.5" />
                    Share Record
                  </SecondaryButton>
                  <Link to={ROUTES.verify(certificate.qrToken)} className="block w-full">
                    <SecondaryButton fullWidth className="text-xs">
                      Public Verify Page
                    </SecondaryButton>
                  </Link>
                </div>
                <SecondaryButton
                  fullWidth
                  className="gap-2 text-xs"
                  onClick={() => window.print()}
                >
                  Print / Save Screen View
                </SecondaryButton>
              </div>
            </div>
          </div>
        ) : null}

        {certificateQuery.isError ? (
          <p className="text-sm text-destructive" role="alert">
            Certificate not found.
          </p>
        ) : null}
      </main>
    </>
  )
}

function CertRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}
