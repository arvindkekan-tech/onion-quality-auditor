import { Download, QrCode, ShieldCheck } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/PageHeader'
import { PrimaryButton, SecondaryButton, StatusBadge } from '@/components/shared'
import { useCertificate } from '@/features/certificates/hooks'
import { APP_NAME } from '@/lib/demo-data'
import { ROUTES } from '@/lib/constants'

export function QualityCertificatePage() {
  const { id = '' } = useParams()
  const certificateQuery = useCertificate(id)
  const certificate = certificateQuery.data

  return (
    <>
      <PageHeader
        title="Digital Certificate"
        subtitle="Official quality record"
        backTo={ROUTES.dashboard}
      />
      <main className="flex flex-1 flex-col gap-4 px-4 py-4">
        {certificateQuery.isPending ? (
          <p className="text-sm text-muted-foreground">Loading certificate…</p>
        ) : null}

        {certificate ? (
          <div className="overflow-hidden rounded-2xl border-2 border-primary/20 bg-card shadow-card">
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
                <StatusBadge status="grade_a" label={certificate.grade} />
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

              <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-surface-muted py-6">
                <QrCode className="size-16 text-primary" aria-hidden />
                <p className="mt-2 text-xs text-muted-foreground">
                  Scan to verify authenticity
                </p>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                  {certificate.qrToken}
                </p>
              </div>

              <div className="space-y-2">
                <Link to={ROUTES.verify(certificate.qrToken)}>
                  <PrimaryButton fullWidth>Verify Certificate</PrimaryButton>
                </Link>
                <SecondaryButton fullWidth className="gap-2">
                  <Download className="size-4" aria-hidden />
                  Download Certificate
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
