import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { InspectionStepLayout } from '@/components/layout/InspectionStepLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useUploadImage } from '@/features/inspections/hooks'
import { useCamera } from '@/hooks/useCamera'
import { ROUTES } from '@/lib/constants'
import { useInspectionDraftStore } from '@/stores/inspectionDraftStore'

export function ImageCapturePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const uploadImage = useUploadImage(id)
  const { images, addImage, removeImage, clearImages } = useInspectionDraftStore()
  const { videoRef, error, isActive, startCamera, stopCamera, capturePhoto } =
    useCamera()
  const [uploadedImageId, setUploadedImageId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    void startCamera()
    return () => stopCamera()
  }, [startCamera, stopCamera])

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) addImage(file)
  }

  function handleCapture() {
    const file = capturePhoto()
    if (file) addImage(file)
  }

  async function handleContinue() {
    if (!images[0]) return
    setIsUploading(true)
    try {
      const uploaded = await uploadImage.mutateAsync(images[0].file)
      setUploadedImageId(uploaded.id)
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
        title="Image Capture"
        subtitle="Capture or upload onion sample photos"
        backTo={ROUTES.newInspection}
      />
      <InspectionStepLayout currentStep="capture">
        <Card>
          <CardHeader>
            <CardTitle>Controlled capture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-hidden rounded-lg border bg-muted">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCapture}
                disabled={!isActive}
              >
                Capture photo
              </Button>
              <label
                className={cn(
                  buttonVariants({ variant: 'outline' }),
                  'cursor-pointer',
                )}
              >
                Upload file
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
            {images.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {images.length} image(s) ready for upload
                </p>
                {images.map((image) => (
                  <div
                    key={image.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <span>{image.file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeImage(image.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
            {uploadedImageId ? (
              <p className="text-sm text-muted-foreground">
                Last uploaded image: {uploadedImageId}
              </p>
            ) : null}
            <Button
              className="w-full"
              disabled={!images[0] || isUploading}
              onClick={handleContinue}
            >
              {isUploading ? 'Uploading…' : 'Continue to quality check'}
            </Button>
          </CardContent>
        </Card>
      </InspectionStepLayout>
    </>
  )
}
