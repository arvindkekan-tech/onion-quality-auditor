import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { InspectionStepLayout } from '@/components/layout/InspectionStepLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateInspection } from '@/features/inspections/hooks'
import { ROUTES } from '@/lib/constants'

export function NewInspectionPage() {
  const navigate = useNavigate()
  const createInspection = useCreateInspection()
  const [variety, setVariety] = useState('Nashik Red')
  const [weightKg, setWeightKg] = useState('25')
  const [location, setLocation] = useState('Warehouse A')

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const inspection = await createInspection.mutateAsync({
      variety,
      weightKg: Number(weightKg),
      location,
    })
    navigate(ROUTES.imageCapture(inspection.id))
  }

  return (
    <>
      <PageHeader
        title="New Inspection"
        subtitle="Enter batch metadata"
        backTo={ROUTES.dashboard}
      />
      <InspectionStepLayout currentStep="new">
        <Card>
          <CardHeader>
            <CardTitle>Batch details</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="variety">Onion variety</Label>
                <Input
                  id="variety"
                  value={variety}
                  onChange={(event) => setVariety(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Batch weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  min="0"
                  step="0.1"
                  value={weightKg}
                  onChange={(event) => setWeightKg(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createInspection.isPending}
              >
                {createInspection.isPending ? 'Creating…' : 'Continue to capture'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </InspectionStepLayout>
    </>
  )
}
