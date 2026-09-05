import { useCallback, useEffect, useRef, useState } from 'react'

type CameraState = {
  stream: MediaStream | null
  error: string | null
  isActive: boolean
  guidance: CameraGuidance
}

export type GuidanceStatus =
  | 'checking'
  | 'good'
  | 'too-dark'
  | 'too-bright'
  | 'blurry'
  | 'low-coverage'
  | 'manual'
  | 'unavailable'

export type CameraGuidance = {
  lighting: GuidanceStatus
  sharpness: GuidanceStatus
  coverage: GuidanceStatus
  overlap: GuidanceStatus
}

const INITIAL_GUIDANCE: CameraGuidance = {
  lighting: 'unavailable',
  sharpness: 'unavailable',
  coverage: 'unavailable',
  overlap: 'manual',
}

const ANALYSIS_WIDTH = 160
const ANALYSIS_HEIGHT = 120
const ANALYSIS_INTERVAL_MS = 300
const DARK_LUMINANCE = 55
const BRIGHT_LUMINANCE = 205
const SHARPNESS_THRESHOLD = 14
const COVERAGE_THRESHOLD = 0.2

function analyzeFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): CameraGuidance {
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    return { ...INITIAL_GUIDANCE, lighting: 'checking', sharpness: 'checking', coverage: 'checking' }
  }

  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return INITIAL_GUIDANCE

  context.drawImage(video, 0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT)
  const pixels = context.getImageData(0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT).data
  const grayscale = new Float32Array(ANALYSIS_WIDTH * ANALYSIS_HEIGHT)
  let luminanceTotal = 0

  for (let pixelIndex = 0; pixelIndex < grayscale.length; pixelIndex += 1) {
    const red = pixels[pixelIndex * 4]
    const green = pixels[pixelIndex * 4 + 1]
    const blue = pixels[pixelIndex * 4 + 2]
    const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
    grayscale[pixelIndex] = luminance
    luminanceTotal += luminance
  }

  const averageLuminance = luminanceTotal / grayscale.length
  const lighting =
    averageLuminance < DARK_LUMINANCE
      ? 'too-dark'
      : averageLuminance > BRIGHT_LUMINANCE
        ? 'too-bright'
        : 'good'

  let gradientTotal = 0
  let gradientSquaredTotal = 0
  let gradientCount = 0
  for (let row = 0; row < ANALYSIS_HEIGHT - 1; row += 1) {
    for (let column = 0; column < ANALYSIS_WIDTH - 1; column += 1) {
      const current = grayscale[row * ANALYSIS_WIDTH + column]
      const horizontal = grayscale[row * ANALYSIS_WIDTH + column + 1]
      const vertical = grayscale[(row + 1) * ANALYSIS_WIDTH + column]
      const gradient = (Math.abs(current - horizontal) + Math.abs(current - vertical)) / 2
      gradientTotal += gradient
      gradientSquaredTotal += gradient * gradient
      gradientCount += 1
    }
  }
  const averageGradient = gradientTotal / gradientCount
  const gradientVariance =
    gradientSquaredTotal / gradientCount - averageGradient * averageGradient
  const sharpnessScore = averageGradient + Math.sqrt(Math.max(0, gradientVariance))
  const sharpness = sharpnessScore >= SHARPNESS_THRESHOLD ? 'good' : 'blurry'

  let borderTotal = 0
  let borderCount = 0
  for (let row = 0; row < ANALYSIS_HEIGHT; row += 1) {
    for (let column = 0; column < ANALYSIS_WIDTH; column += 1) {
      if (
        row < 8 ||
        row >= ANALYSIS_HEIGHT - 8 ||
        column < 8 ||
        column >= ANALYSIS_WIDTH - 8
      ) {
        borderTotal += grayscale[row * ANALYSIS_WIDTH + column]
        borderCount += 1
      }
    }
  }
  const borderLuminance = borderTotal / borderCount
  let foregroundCount = 0
  for (let pixelIndex = 0; pixelIndex < grayscale.length; pixelIndex += 1) {
    if (Math.abs(grayscale[pixelIndex] - borderLuminance) > 22) {
      foregroundCount += 1
    }
  }
  const foregroundRatio = foregroundCount / grayscale.length
  const coverage = foregroundRatio >= COVERAGE_THRESHOLD ? 'good' : 'low-coverage'

  return { lighting, sharpness, coverage, overlap: 'manual' }
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [state, setState] = useState<CameraState>({
    stream: null,
    error: null,
    isActive: false,
    guidance: INITIAL_GUIDANCE,
  })

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      setState({
        stream,
        error: null,
        isActive: true,
        guidance: { ...INITIAL_GUIDANCE, lighting: 'checking', sharpness: 'checking', coverage: 'checking' },
      })
      return stream
    } catch {
      const message = 'Unable to access camera. Use file upload instead.'
      setState({
        stream: null,
        error: message,
        isActive: false,
        guidance: INITIAL_GUIDANCE,
      })
      return null
    }
  }, [])

  const stopCamera = useCallback(() => {
    setState((current) => {
      current.stream?.getTracks().forEach((track) => track.stop())
      return { stream: null, error: null, isActive: false, guidance: INITIAL_GUIDANCE }
    })
  }, [])

  const capturePhoto = useCallback((): File | null => {
    const video = videoRef.current
    if (!video || !state.isActive) return null

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    if (!context) return null

    context.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    const byteString = atob(dataUrl.split(',')[1] ?? '')
    const buffer = new Uint8Array(byteString.length)
    for (let i = 0; i < byteString.length; i += 1) {
      buffer[i] = byteString.charCodeAt(i)
    }
    return new File([buffer], `capture-${Date.now()}.jpg`, {
      type: 'image/jpeg',
    })
  }, [state.isActive])

  useEffect(() => {
    const video = videoRef.current
    if (video && state.stream) {
      video.srcObject = state.stream
    }
  }, [state.stream])

  useEffect(() => {
    if (!state.stream) return

    const canvas = document.createElement('canvas')
    canvas.width = ANALYSIS_WIDTH
    canvas.height = ANALYSIS_HEIGHT
    const interval = window.setInterval(() => {
      const video = videoRef.current
      if (!video) return
      const nextGuidance = analyzeFrame(video, canvas)
      setState((current) => {
        if (
          current.guidance.lighting === nextGuidance.lighting &&
          current.guidance.sharpness === nextGuidance.sharpness &&
          current.guidance.coverage === nextGuidance.coverage &&
          current.guidance.overlap === nextGuidance.overlap
        ) {
          return current
        }
        return { ...current, guidance: nextGuidance }
      })
    }, ANALYSIS_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [state.stream])

  useEffect(() => () => stopCamera(), [stopCamera])

  return {
    videoRef,
    error: state.error,
    isActive: state.isActive,
    startCamera,
    stopCamera,
    capturePhoto,
    guidance: state.guidance,
  }
}
