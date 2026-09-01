import { useEffect } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { InspectionStepLayout } from '@/components/layout/InspectionStepLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCheckImageQuality } from '@/features/inspections/hooks'
import { ROUTES } from '@/lib/constants'

type LocationState = {
  imageId?: string
}

export function ImageQualityCheckPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const imageId = (location.state as LocationState | null)?.imageId ?? 'demo-image'
  const { mutate, isPending, data, isError } = useCheckImageQuality(id, imageId)

  useEffect(() => {
    mutate()
  }, [id, imageId, mutate])

  return (
    <>
      <PageHeader
        title="Image Quality Check"
        subtitle="Server-side quality feedback"
        backTo={ROUTES.imageCapture(id)}
      />
      <InspectionStepLayout currentStep="quality">
        <Card>
          <CardHeader>
            <CardTitle>Quality assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isPending ? (
              <p className="text-sm text-muted-foreground">Checking image quality…</p>
            ) : null}
            {isError ? (
              <p className="text-sm text-destructive">
                Quality check failed. Try uploading again.
              </p>
            ) : null}
            {data ? (
              <div className="space-y-3">
                <Badge variant={data.passed ? 'default' : 'destructive'}>
                  {data.passed ? 'Passed' : 'Needs retake'}
                </Badge>
                {data.score !== undefined ? (
                  <p className="text-sm">Quality score: {data.score}</p>
                ) : null}
                {data.issues.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {data.issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Image meets capture guidelines.
                  </p>
                )}
              </div>
            ) : null}
            <Button
              className="w-full"
              disabled={!data?.passed || isPending}
              onClick={() => navigate(ROUTES.aiAnalysis(id))}
            >
              Continue to AI analysis
            </Button>
          </CardContent>
        </Card>
      </InspectionStepLayout>
    </>
  )
}
