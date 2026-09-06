import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Circle,
  ImagePlus,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { InspectionStepLayout } from '@/components/layout/InspectionStepLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { PrimaryButton, SecondaryButton } from '@/components/shared'
import { useUploadImage } from '@/features/inspections/hooks'
import { captureConditions } from '@/lib/demo-data'
import { ROUTES } from '@/lib/constants'
import { useCamera, type GuidanceStatus } from '@/hooks/useCamera'
import { cn } from '@/lib/utils'
import { useInspectionDraftStore } from '@/stores/inspectionDraftStore'

export function ImageCapturePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const uploadImage = useUploadImage(id)
  const { images, previewUrl, addImage, removeImage, clearImages } =
    useInspectionDraftStore()
  const {
    videoRef,
    error,
    isActive,
    startCamera,
    stopCamera,
    capturePhoto,
    guidance,
  } = useCamera()
  const [isUploading, setIsUploading] = useState(false)
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null)
  const [isCapturingMore, setIsCapturingMore] = useState(false)

  const hasImage = images.length > 0
  const canCaptureMore = images.length < 5

  useEffect(() => {
    if (!hasImage || isCapturingMore) {
      void startCamera()
    } else {
      stopCamera()
    }
    return () => stopCamera()
  }, [hasImage, isCapturingMore, startCamera, stopCamera])

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      stopCamera()
      setIsCapturingMore(false)
      const remainingSlots = Math.max(0, 5 - images.length)
      for (const file of files.slice(0, remainingSlots)) {
        addImage(file)
      }
    }
  }

  function handleCapture() {
    const file = capturePhoto()
    if (file) {
      stopCamera()
      setIsCapturingMore(false)
      addImage(file)
    }
  }

  function handleRetake() {
    clearImages()
    setActivePreviewId(null)
    setIsCapturingMore(false)
    void startCamera()
  }

  function handleAddMore() {
    if (canCaptureMore) {
      setIsCapturingMore(true)
      void startCamera()
    }
  }

  async function handleContinue() {
    if (images.length === 0) return
    setIsUploading(true)
    try {
      let lastUploadedId = ''
      for (const item of images) {
        const uploaded = await uploadImage.mutateAsync(item.file)
        lastUploadedId = uploaded.id
      }
      navigate(ROUTES.imageQuality(id), {
        state: { imageId: lastUploadedId },
      })
    } finally {
      setIsUploading(false)
    }
  }

  const warnings: string[] = []
  if (guidance.lighting === 'too-dark') warnings.push('Too dark')
  if (guidance.lighting === 'too-bright') warnings.push('Too bright')
  if (guidance.sharpness === 'blurry') warnings.push('Blurry / camera motion')
  if (guidance.coverage === 'low-coverage') warnings.push('Low tray coverage')

  const isChecking = guidance.lighting === 'checking' || guidance.sharpness === 'checking'
  const qualityLevel = !isActive
    ? 'ready'
    : isChecking
      ? 'checking'
      : warnings.length === 0
        ? 'good'
        : warnings.length === 1
          ? 'fair'
          : 'poor'

  const qualityLabel =
    qualityLevel === 'ready'
      ? 'Capture Ready'
      : qualityLevel === 'checking'
        ? 'Assessing…'
        : qualityLevel === 'good'
          ? 'Capture Quality: Good'
          : qualityLevel === 'fair'
            ? `Capture Quality: Fair (${warnings[0]})`
            : `Capture Quality: Poor (${warnings.join(', ')})`

  const activeDisplayUrl =
    images.find((img) => img.id === activePreviewId)?.previewUrl ||
    (images.length > 0 ? images[images.length - 1].previewUrl : previewUrl)

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
              tray visibility with minimal overlap between bulbs. Multiple trays
              (up to 5) can be captured for a single inspection.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-border bg-black shadow-card">
            {hasImage && !isCapturingMore && activeDisplayUrl ? (
              <img
                src={activeDisplayUrl}
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

            {/* Viewfinder HUD Quality Indicator */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-center pointer-events-none">
              <div
                className={cn(
                  'rounded-full px-3 py-1 text-[11px] font-semibold backdrop-blur shadow-md transition-colors',
                  qualityLevel === 'good'
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                    : qualityLevel === 'fair'
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                      : qualityLevel === 'poor'
                        ? 'bg-red-950/80 text-red-300 border border-red-500/40'
                        : 'bg-black/70 text-gray-300 border border-white/20',
                )}
              >
                {qualityLabel}
              </div>
            </div>
          </div>

          {hasImage ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-wider text-muted-foreground">
                  Captured Trays ({images.length}/5)
                </span>
                {isCapturingMore ? (
                  <button
                    type="button"
                    onClick={() => setIsCapturingMore(false)}
                    className="text-primary hover:underline"
                  >
                    View Captured
                  </button>
                ) : null}
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => {
                  const isSelected =
                    !isCapturingMore &&
                    (activePreviewId === img.id ||
                      (!activePreviewId && idx === images.length - 1))
                  return (
                    <div
                      key={img.id}
                      onClick={() => {
                        setIsCapturingMore(false)
                        setActivePreviewId(img.id)
                      }}
                      className={cn(
                        'relative size-16 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 transition-all',
                        isSelected
                          ? 'border-primary ring-2 ring-primary/30'
                          : 'border-border opacity-70 hover:opacity-100',
                      )}
                    >
                      <img
                        src={img.previewUrl}
                        alt={`Tray ${idx + 1}`}
                        className="size-full object-cover"
                      />
                      <span className="absolute inset-x-0 bottom-0 bg-black/70 text-center text-[9px] font-bold text-white">
                        Tray {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeImage(img.id)
                          if (activePreviewId === img.id) setActivePreviewId(null)
                        }}
                        className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-black/70 text-white hover:bg-destructive"
                        aria-label={`Remove tray ${idx + 1}`}
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  )
                })}
                {canCaptureMore && !isCapturingMore ? (
                  <button
                    type="button"
                    onClick={handleAddMore}
                    className="flex size-16 shrink-0 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-muted text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    <ImagePlus className="mb-0.5 size-4" />
                    <span className="text-[9px] font-medium">+ Add Tray</span>
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            {captureConditions.map((condition) => {
              const status =
                condition.key === 'focus'
                  ? guidance.sharpness
                  : guidance[condition.key]
              const isGood = status === 'good'
              const isWarning =
                status === 'too-dark' ||
                status === 'too-bright' ||
                status === 'blurry' ||
                status === 'low-coverage'
              return (
                <div
                  key={condition.key}
                  className={cn(
                    'flex items-start gap-2 rounded-lg border p-2.5',
                    isGood
                      ? 'border-success/20 bg-success/5'
                      : isWarning
                        ? 'border-warning/20 bg-accent'
                        : 'border-border bg-surface-muted',
                  )}
                >
                  {isGood ? (
                    <CheckCircle2
                      className="mt-0.5 size-4 shrink-0 text-success"
                      aria-hidden
                    />
                  ) : isWarning ? (
                    <AlertCircle
                      className="mt-0.5 size-4 shrink-0 text-warning"
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
                    <p
                      className={cn(
                        'text-[10px] font-medium',
                        isGood
                          ? 'text-success'
                          : isWarning
                            ? 'text-warning'
                            : 'text-muted-foreground',
                      )}
                    >
                      {guidanceLabel(status)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {!hasImage || isCapturingMore ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <PrimaryButton
                  className="flex-1 gap-2"
                  onClick={handleCapture}
                  disabled={!isActive}
                >
                  <Camera className="size-4" aria-hidden />
                  {isCapturingMore
                    ? `Capture Tray ${images.length + 1}`
                    : 'Capture Sample'}
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
                    multiple
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
              {isCapturingMore ? (
                <SecondaryButton
                  fullWidth
                  onClick={() => setIsCapturingMore(false)}
                >
                  Cancel (Keep {images.length} Tray
                  {images.length > 1 ? 's' : ''})
                </SecondaryButton>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <SecondaryButton className="flex-1" onClick={handleRetake}>
                  Retake All
                </SecondaryButton>
                {canCaptureMore ? (
                  <SecondaryButton className="flex-1" onClick={handleAddMore}>
                    + Add Tray
                  </SecondaryButton>
                ) : null}
                <PrimaryButton
                  className="flex-1"
                  disabled={isUploading}
                  onClick={handleContinue}
                >
                  {isUploading
                    ? 'Uploading…'
                    : `Continue (${images.length} Tray${images.length > 1 ? 's' : ''})`}
                </PrimaryButton>
              </div>
            </div>
          )}

          {!hasImage && isActive && (guidance.lighting !== 'good' || guidance.sharpness !== 'good' || guidance.coverage !== 'good') ? (
            <p className="text-xs text-muted-foreground">
              Guidance is advisory. Capture is available while the camera is active; improve failed checks when possible.
            </p>
          ) : null}
        </div>
      </InspectionStepLayout>
    </>
  )
}

function guidanceLabel(status: GuidanceStatus) {
  switch (status) {
    case 'checking':
      return 'Checking…'
    case 'good':
      return 'Good'
    case 'too-dark':
      return 'Too dark'
    case 'too-bright':
      return 'Too bright'
    case 'blurry':
      return 'Blurry / steady camera'
    case 'low-coverage':
      return 'Too little sample coverage'
    case 'manual':
      return 'Manual check'
    default:
      return 'Unavailable'
  }
}
