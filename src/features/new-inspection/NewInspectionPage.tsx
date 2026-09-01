import { useNavigate } from 'react-router-dom'

import { InspectionStepLayout } from '@/components/layout/InspectionStepLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { PrimaryButton } from '@/components/shared'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateInspection } from '@/features/inspections/hooks'
import { PROCUREMENT_CENTRES, APP_INSTITUTION } from '@/lib/demo-data'
import { ROUTES } from '@/lib/constants'
import { useInspectionDraftStore } from '@/stores/inspectionDraftStore'

export function NewInspectionPage() {
  const navigate = useNavigate()
  const createInspection = useCreateInspection()
  const { metadata, setMetadata } = useInspectionDraftStore()

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const inspection = await createInspection.mutateAsync({
      variety: metadata.specification,
      weightKg: metadata.expectedSampleSize * 0.4,
      location: metadata.procurementCentre,
    })
    navigate(ROUTES.imageCapture(inspection.id))
  }

  return (
    <>
      <PageHeader
        title="New Inspection"
        subtitle={APP_INSTITUTION}
        backTo={ROUTES.dashboard}
      />
      <InspectionStepLayout currentStep="batch">
        <form className="flex flex-1 flex-col gap-4" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="space-y-2">
              <Label htmlFor="batchId">Batch ID</Label>
              <Input
                id="batchId"
                value={metadata.batchId}
                onChange={(e) => setMetadata({ batchId: e.target.value })}
                placeholder="OKB-2024-1847"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="centre">Procurement Centre</Label>
              <Input
                id="centre"
                list="centres"
                value={metadata.procurementCentre}
                onChange={(e) =>
                  setMetadata({ procurementCentre: e.target.value })
                }
                required
              />
              <datalist id="centres">
                {PROCUREMENT_CENTRES.map((centre) => (
                  <option key={centre} value={centre} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspector">Inspector / Operator</Label>
              <Input
                id="inspector"
                value={metadata.inspector}
                onChange={(e) => setMetadata({ inspector: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specification">Procurement Specification</Label>
              <Input
                id="specification"
                value={metadata.specification}
                onChange={(e) => setMetadata({ specification: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="farmer">Farmer / FPO (optional)</Label>
              <Input
                id="farmer"
                value={metadata.farmerFpo}
                onChange={(e) => setMetadata({ farmerFpo: e.target.value })}
                placeholder="Cooperative or farmer name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sampleSize">Expected Sample Size</Label>
              <Input
                id="sampleSize"
                type="number"
                min={10}
                max={100}
                value={metadata.expectedSampleSize}
                onChange={(e) =>
                  setMetadata({
                    expectedSampleSize: Number(e.target.value),
                  })
                }
                required
              />
            </div>
          </div>
          <div className="mt-auto pt-2">
            <PrimaryButton
              type="submit"
              fullWidth
              disabled={createInspection.isPending}
            >
              {createInspection.isPending
                ? 'Creating inspection…'
                : 'Start Controlled Capture'}
            </PrimaryButton>
          </div>
        </form>
      </InspectionStepLayout>
    </>
  )
}
