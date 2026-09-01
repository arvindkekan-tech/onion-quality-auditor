import { Link, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCertificate } from '@/features/certificates/hooks'
import { ROUTES } from '@/lib/constants'

export function QualityCertificatePage() {
  const { id = '' } = useParams()
  const certificateQuery = useCertificate(id)
  const certificate = certificateQuery.data

  return (
    <>
      <PageHeader
        title="Digital Certificate"
        subtitle="Issued quality certificate"
        backTo={ROUTES.dashboard}
      />
      <main className="flex flex-1 flex-col gap-4 px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Certificate details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {certificateQuery.isPending ? (
              <p className="text-sm text-muted-foreground">Loading certificate…</p>
            ) : null}
            {certificateQuery.isError ? (
              <p className="text-sm text-destructive">Certificate not found.</p>
            ) : null}
            {certificate ? (
              <div className="space-y-3 text-sm">
                <Badge>{certificate.grade}</Badge>
                <p>
                  <span className="text-muted-foreground">Batch:</span>{' '}
                  {certificate.batchLabel}
                </p>
                <p>
                  <span className="text-muted-foreground">Issued:</span>{' '}
                  {new Date(certificate.issuedAt).toLocaleString()}
                </p>
                <p>
                  <span className="text-muted-foreground">Certificate ID:</span>{' '}
                  {certificate.id}
                </p>
                <Link to={ROUTES.verify(certificate.qrToken)}>
                  <Button className="w-full">Open QR verification</Button>
                </Link>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </main>
    </>
  )
}
