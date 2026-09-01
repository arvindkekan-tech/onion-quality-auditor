import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { InspectionStepLayout } from '@/components/layout/InspectionStepLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSubmitReview } from '@/features/inspections/hooks'
import { ROUTES } from '@/lib/constants'

export function HumanReviewPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const submitReview = useSubmitReview(id)
  const [notes, setNotes] = useState('')
  const [overrideGrade, setOverrideGrade] = useState('')

  async function handleApprove() {
    const response = await submitReview.mutateAsync({
      approved: true,
      notes: notes || undefined,
      overrideGrade: overrideGrade || undefined,
    })
    navigate(ROUTES.certificate(response.certificateId))
  }

  return (
    <>
      <PageHeader
        title="Human Review"
        subtitle="Confirm or override backend grading"
        backTo={ROUTES.inspectionResults(id)}
      />
      <InspectionStepLayout currentStep="review">
        <Card>
          <CardHeader>
            <CardTitle>Inspector review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The frontend submits review decisions to the backend. It does not
              calculate final grades locally.
            </p>
            <div className="space-y-2">
              <Label htmlFor="override-grade">Override grade (optional)</Label>
              <Input
                id="override-grade"
                placeholder="Leave blank to accept AI grade"
                value={overrideGrade}
                onChange={(event) => setOverrideGrade(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Review notes</Label>
              <Input
                id="notes"
                placeholder="Add inspector comments"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
            <Button
              className="w-full"
              disabled={submitReview.isPending}
              onClick={handleApprove}
            >
              {submitReview.isPending ? 'Submitting…' : 'Approve and issue certificate'}
            </Button>
          </CardContent>
        </Card>
      </InspectionStepLayout>
    </>
  )
}
