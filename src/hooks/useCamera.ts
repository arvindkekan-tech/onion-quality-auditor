import { useCallback, useEffect, useRef, useState } from 'react'

type CameraState = {
  stream: MediaStream | null
  error: string | null
  isActive: boolean
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [state, setState] = useState<CameraState>({
    stream: null,
    error: null,
    isActive: false,
  })

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      setState({ stream, error: null, isActive: true })
      return stream
    } catch {
      const message = 'Unable to access camera. Use file upload instead.'
      setState({ stream: null, error: message, isActive: false })
      return null
    }
  }, [])

  const stopCamera = useCallback(() => {
    setState((current) => {
      current.stream?.getTracks().forEach((track) => track.stop())
      return { stream: null, error: null, isActive: false }
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

  useEffect(() => () => stopCamera(), [stopCamera])

  return {
    videoRef,
    error: state.error,
    isActive: state.isActive,
    startCamera,
    stopCamera,
    capturePhoto,
  }
}
