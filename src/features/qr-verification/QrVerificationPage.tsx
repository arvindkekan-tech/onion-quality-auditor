import { Link, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useVerifyCertificate } from '@/features/certificates/hooks'
import { ROUTES } from '@/lib/constants'

export function QrVerificationPage() {
  const { token = '' } = useParams()
  const verificationQuery = useVerifyCertificate(token)
  const verification = verificationQuery.data

  return (
    <>
      <PageHeader
        title="QR Verification"
        subtitle="Public certificate verification"
        backTo={ROUTES.dashboard}
      />
      <main className="flex flex-1 flex-col gap-4 px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Verification result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              QR scanner integration will be added here. For now, verification uses
              the token from the certificate route.
            </p>
            {verificationQuery.isPending ? (
              <p className="text-sm text-muted-foreground">Verifying token…</p>
            ) : null}
            {verification ? (
              <div className="space-y-3 text-sm">
                <Badge variant={verification.valid ? 'default' : 'destructive'}>
                  {verification.valid ? 'Valid' : 'Invalid'}
                </Badge>
                <p>{verification.message}</p>
                {verification.certificate ? (
                  <div className="space-y-1 rounded-md border p-3">
                    <p>Grade: {verification.certificate.grade}</p>
                    <p>Batch: {verification.certificate.batchLabel}</p>
                    <p>Issued: {new Date(verification.certificate.issuedAt).toLocaleString()}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
            <Link to={ROUTES.dashboard}>
              <Button variant="outline" className="w-full">
                Back to dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    </>
  )
}
