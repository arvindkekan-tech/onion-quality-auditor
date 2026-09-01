import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { InspectionStepLayout } from '@/components/layout/InspectionStepLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  useAnalysisStatus,
  useStartAnalysis,
} from '@/features/inspections/hooks'
import { ROUTES } from '@/lib/constants'

export function AiAnalysisPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const startAnalysis = useStartAnalysis(id)
  const analysisStatus = useAnalysisStatus(id)
  const hasStarted = useRef(false)

  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true
      startAnalysis.mutate()
    }
  }, [startAnalysis])

  useEffect(() => {
    if (analysisStatus.data?.status === 'completed') {
      navigate(ROUTES.inspectionResults(id))
    }
  }, [analysisStatus.data?.status, id, navigate])

  const status = analysisStatus.data

  return (
    <>
      <PageHeader
        title="AI Analysis"
        subtitle="Waiting for backend model results"
        backTo={ROUTES.imageQuality(id)}
      />
      <InspectionStepLayout currentStep="analysis">
        <Card>
          <CardHeader>
            <CardTitle>Analysis in progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The frontend polls the backend for analysis status. No inference runs
              in the browser.
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Status</span>
                <span className="capitalize">{status?.status ?? 'starting'}</span>
              </div>
              <Progress value={status?.progress ?? 10} />
            </div>
            {status?.message ? (
              <p className="text-sm text-muted-foreground">{status.message}</p>
            ) : null}
            {analysisStatus.isError ? (
              <p className="text-sm text-destructive">
                Unable to fetch analysis status.
              </p>
            ) : null}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => analysisStatus.refetch()}
            >
              Refresh status
            </Button>
          </CardContent>
        </Card>
      </InspectionStepLayout>
    </>
  )
}
