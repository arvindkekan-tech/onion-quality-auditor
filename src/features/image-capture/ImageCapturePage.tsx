import { Camera, CheckCircle2, Circle, ImagePlus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { InspectionStepLayout } from '@/components/layout/InspectionStepLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { PrimaryButton, SecondaryButton } from '@/components/shared'
import { useUploadImage } from '@/features/inspections/hooks'
import { captureConditions } from '@/lib/demo-data'
import { ROUTES } from '@/lib/constants'
import { useCamera } from '@/hooks/useCamera'
import { cn } from '@/lib/utils'
import { useInspectionDraftStore } from '@/stores/inspectionDraftStore'

export function ImageCapturePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const uploadImage = useUploadImage(id)
  const { images, previewUrl, addImage, removeImage, clearImages } =
    useInspectionDraftStore()
  const { videoRef, error, isActive, startCamera, stopCamera, capturePhoto } =
    useCamera()
  const [isUploading, setIsUploading] = useState(false)
  const hasImage = images.length > 0

  useEffect(() => {
    if (!hasImage) void startCamera()
    return () => stopCamera()
  }, [hasImage, startCamera, stopCamera])

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      stopCamera()
      addImage(file)
    }
  }

  function handleCapture() {
    const file = capturePhoto()
    if (file) {
      stopCamera()
      addImage(file)
    }
  }

  function handleRetake() {
    if (images[0]) removeImage(images[0].id)
    void startCamera()
  }

  async function handleContinue() {
    if (!images[0]) return
    setIsUploading(true)
    try {
      const uploaded = await uploadImage.mutateAsync(images[0].file)
      clearImages()
      navigate(ROUTES.imageQuality(id), {
        state: { imageId: uploaded.id },
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Controlled Capture"
        subtitle="Position sample per procurement guidelines"
        backTo={ROUTES.newInspection}
      />
      <InspectionStepLayout currentStep="capture">
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-3 shadow-soft">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Sample placement
            </p>
            <p className="text-sm text-foreground">
              Place onions in a single layer on a neutral background. Ensure full
              tray visibility with minimal overlap between bulbs.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-black shadow-card">
            {hasImage && previewUrl ? (
              <img
                src={previewUrl}
                alt="Captured onion sample"
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="aspect-[4/3] w-full object-cover"
                aria-label="Camera preview for sample capture"
              />
            )}
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            {captureConditions.map((condition, index) => {
              const met = hasImage || (isActive && index < 3)
              return (
                <div
                  key={condition.key}
                  className={cn(
                    'flex items-start gap-2 rounded-lg border p-2.5',
                    met
                      ? 'border-success/20 bg-success/5'
                      : 'border-border bg-surface-muted',
                  )}
                >
                  {met ? (
                    <CheckCircle2
                      className="mt-0.5 size-4 shrink-0 text-success"
                      aria-hidden
                    />
                  ) : (
                    <Circle
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  )}
                  <div>
                    <p className="text-xs font-medium">{condition.label}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {condition.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {!hasImage ? (
            <div className="flex gap-2">
              <PrimaryButton
                className="flex-1 gap-2"
                onClick={handleCapture}
                disabled={!isActive}
              >
                <Camera className="size-4" aria-hidden />
                Capture Sample
              </PrimaryButton>
              <label
                className={cn(
                  'inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium shadow-soft',
                )}
              >
                <ImagePlus className="size-4" aria-hidden />
                Upload
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-success/20 bg-success/5 px-3 py-2">
                <span className="text-sm font-medium text-success">
                  Sample captured
                </span>
                <button
                  type="button"
                  onClick={() => images[0] && removeImage(images[0].id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Remove captured image"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <SecondaryButton className="flex-1" onClick={handleRetake}>
                  Retake
                </SecondaryButton>
                <PrimaryButton
                  className="flex-1"
                  disabled={isUploading}
                  onClick={handleContinue}
                >
                  {isUploading ? 'Uploading…' : 'Continue'}
                </PrimaryButton>
              </div>
            </div>
          )}
        </div>
      </InspectionStepLayout>
    </>
  )
}
