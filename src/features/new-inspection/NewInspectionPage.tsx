import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Info, Sparkles } from 'lucide-react'

import { InspectionStepLayout } from '@/components/layout/InspectionStepLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { PrimaryButton } from '@/components/shared'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateInspection } from '@/features/inspections/hooks'
import { PROCUREMENT_CENTRES, APP_INSTITUTION } from '@/lib/demo-data'
import { ROUTES } from '@/lib/constants'
import { useAuthStore } from '@/stores/authStore'
import { useInspectionDraftStore } from '@/stores/inspectionDraftStore'

export function NewInspectionPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const createInspection = useCreateInspection()
  const { metadata, setMetadata } = useInspectionDraftStore()

  useEffect(() => {
    if (user?.name && !metadata.inspector) {
      setMetadata({ inspector: user.name })
    }
  }, [user?.name, metadata.inspector, setMetadata])

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
          {/* Step Guidance Header */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
            <div className="flex items-center justify-between font-semibold text-primary">
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-3.5" />
                Inspection Workflow
              </span>
              <span className="text-[10px] uppercase tracking-wider font-bold">4-Stage Pipeline</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-slate-700">
              <span className="font-bold text-primary">1 Capture</span>
              <span>→</span>
              <span>2 Check</span>
              <span>→</span>
              <span>3 Analyze</span>
              <span>→</span>
              <span>4 Review</span>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="space-y-2">
              <Label htmlFor="batchId">Batch / Lot ID</Label>
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
              <Label htmlFor="inspector">Authorized Officer / Inspector</Label>
              <Input
                id="inspector"
                value={metadata.inspector || user?.name || ''}
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
              <Label htmlFor="sampleSize">Expected Sample Count</Label>
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

          {/* Field Guidance Box */}
          <div className="space-y-2 rounded-xl border border-border bg-surface-muted p-3.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <Info className="size-3.5 text-primary" />
              <span>For best inspection results:</span>
            </div>
            <ul className="space-y-1 pl-4 list-disc text-[11px]">
              <li>Keep the sample clearly visible on a neutral tray surface.</li>
              <li>Ensure even, sufficient lighting without direct harsh glare.</li>
              <li>Keep the entire sample inside the camera frame.</li>
              <li>Avoid camera motion blur and hold device stable.</li>
              <li>Spread bulbs in a single layer with minimal overlap.</li>
            </ul>
          </div>

          <div className="mt-auto pt-2">
            <PrimaryButton
              type="submit"
              fullWidth
              className="gap-2"
              disabled={createInspection.isPending}
            >
              <Camera className="size-4" />
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
