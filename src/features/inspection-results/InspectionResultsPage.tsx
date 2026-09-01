import { useNavigate, useParams } from 'react-router-dom'

import { InspectionStepLayout } from '@/components/layout/InspectionStepLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useInspectionResults } from '@/features/inspections/hooks'
import { ROUTES } from '@/lib/constants'

export function InspectionResultsPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const resultsQuery = useInspectionResults(id)
  const results = resultsQuery.data

  return (
    <>
      <PageHeader
        title="Inspection Results"
        subtitle="Grades provided by the backend API"
        backTo={ROUTES.aiAnalysis(id)}
      />
      <InspectionStepLayout currentStep="results">
        <Card>
          <CardHeader>
            <CardTitle>AI inspection output</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {resultsQuery.isPending ? (
              <p className="text-sm text-muted-foreground">Loading results…</p>
            ) : null}
            {resultsQuery.isError ? (
              <p className="text-sm text-destructive">Results are not available yet.</p>
            ) : null}
            {results ? (
              <div className="space-y-3">
                <Badge>{results.grade}</Badge>
                <p className="text-sm">
                  Confidence: {(results.confidence * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground">{results.summary}</p>
                <ul className="space-y-1 text-sm">
                  {results.defects.map((defect) => (
                    <li key={defect.label}>
                      {defect.label}: {defect.count}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <Button
              className="w-full"
              disabled={!results}
              onClick={() => navigate(ROUTES.humanReview(id))}
            >
              Continue to human review
            </Button>
          </CardContent>
        </Card>
      </InspectionStepLayout>
    </>
  )
}
