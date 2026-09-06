import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

interface QrCodeViewProps {
  value: string
  size?: number
  className?: string
  alt?: string
}

export function QrCodeView({
  value,
  size = 180,
  className = '',
  alt = 'Inspection Verification QR Code',
}: QrCodeViewProps) {
  const [dataUrl, setDataUrl] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    if (!value) {
      return
    }

    void QRCode.toDataURL(value, {
      width: size * 2, // 2x for sharp retina displays
      margin: 1,
      color: {
        dark: '#1b4332', // ONIVIS forest green primary
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (isMounted) {
          setDataUrl(url)
          setError(null)
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to generate QR code:', err)
          setError('QR Code generation failed')
        }
      })

    return () => {
      isMounted = false
    }
  }, [value, size])

  if (error) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-destructive/10 text-xs text-destructive ${className}`}
        style={{ width: size, height: size }}
      >
        {error}
      </div>
    )
  }

  if (!dataUrl) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-surface-muted text-xs text-muted-foreground animate-pulse ${className}`}
        style={{ width: size, height: size }}
      >
        Generating QR…
      </div>
    )
  }

  return (
    <img
      src={dataUrl}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-lg border border-border bg-white p-2 shadow-sm ${className}`}
    />
  )
}
