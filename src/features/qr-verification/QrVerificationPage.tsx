import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import {
  Camera,
  CheckCircle2,
  FileSearch,
  QrCode,
  RotateCcw,
  ShieldCheck,
  Upload,
  X,
  XCircle,
} from 'lucide-react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/PageHeader'
import {
  PrimaryButton,
  SecondaryButton,
  StandardsMatrix,
  StatusBadge,
  WhyThisGradeCard,
} from '@/components/shared'
import { useVerifyCertificate } from '@/features/certificates/hooks'
import { useSubmitFarmerReviewRequest } from '@/features/inspections/hooks'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { ReviewRequestResponse } from '@/types/inspection'

const DISPUTE_CATEGORIES = [
  'Grade / Defect Classification Discrepancy',
  'Bulb Size / Caliber Disagreement',
  'Skin Curing & Moisture Re-test',
  'Tray Sampling Representation Dispute',
  'Other General Inquiry / Re-Audit Request',
]

function extractTokenFromQrData(raw: string): string {
  const trimmed = raw.trim()
  const urlMatch = trimmed.match(/\/verify\/([^/?#]+)/i)
  if (urlMatch && urlMatch[1]) {
    return decodeURIComponent(urlMatch[1])
  }
  const queryMatch = trimmed.match(/[?&]token=([^&#]+)/i)
  if (queryMatch && queryMatch[1]) {
    return decodeURIComponent(queryMatch[1])
  }
  const certMatch = trimmed.match(/(?:qr-cert-[a-f0-9-]+|cert-[a-f0-9-]+)/i)
  if (certMatch) {
    return certMatch[0]
  }
  return trimmed
}

export function QrVerificationPage() {
  const { token: routeToken = '' } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Active token to verify (route param or entered token)
  const [userEnteredToken, setUserEnteredToken] = useState('')
  const [inputToken, setInputToken] = useState(routeToken)
  const activeToken = routeToken || userEnteredToken

  const initialMode = searchParams.get('mode')
  const [activeTab, setActiveTab] = useState<'id' | 'qr'>(
    initialMode === 'scan' || initialMode === 'upload' ? 'qr' : 'id',
  )

  // Camera scan state
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)

  // QR image upload state
  const qrFileInputRef = useRef<HTMLInputElement | null>(null)
  const [qrUploadError, setQrUploadError] = useState<string | null>(null)
  const [isDecodingQr, setIsDecodingQr] = useState(false)

  const verificationQuery = useVerifyCertificate(activeToken)
  const verification = verificationQuery.data
  const cert = verification?.certificate
  const inspectionId = cert?.inspectionId || ''

  const submitReviewRequest = useSubmitFarmerReviewRequest(inspectionId)

  // Review request modal state
  const [showDisputeModal, setShowDisputeModal] = useState(false)
  const [farmerName, setFarmerName] = useState('')
  const [farmerPhone, setFarmerPhone] = useState('')
  const [reasonCategory, setReasonCategory] = useState(DISPUTE_CATEGORIES[0])
  const [farmerComments, setFarmerComments] = useState('')
  const [submissionResult, setSubmissionResult] = useState<ReviewRequestResponse | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Camera cleanup
  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  // Auto-start camera if mode=scan
  useEffect(() => {
    if (initialMode === 'scan' && !activeToken) {
      startCamera()
    }
  }, [initialMode, activeToken])

  function scanFrame() {
    if (!videoRef.current) return
    const video = videoRef.current
    if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        })
        if (code && code.data) {
          stopCamera()
          const token = extractTokenFromQrData(code.data)
          setUserEnteredToken(token)
          setInputToken(token)
          navigate(`/verify/${token}`)
          return
        }
      }
    }
    animFrameRef.current = requestAnimationFrame(scanFrame)
  }

  async function startCamera() {
    setCameraError(null)
    setQrUploadError(null)
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser. Enter the Certificate ID manually.')
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      setCameraActive(true)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        animFrameRef.current = requestAnimationFrame(scanFrame)
      }
    } catch (err: unknown) {
      setCameraError(err instanceof Error ? err.message : 'Unable to access camera.')
      setCameraActive(false)
    }
  }

  function stopCamera() {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  // Handle uploaded QR image decoding
  async function handleQrImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setQrUploadError(null)

    // Validate format: JPG, JPEG, PNG
    const validMimes = ['image/jpeg', 'image/png', 'image/jpg']
    const fileExt = file.name.split('.').pop()?.toLowerCase() || ''
    if (!validMimes.includes(file.type) && !['jpg', 'jpeg', 'png'].includes(fileExt)) {
      setQrUploadError('Please select a JPG, PNG, or JPEG image.')
      if (e.target) e.target.value = ''
      return
    }

    setIsDecodingQr(true)
    try {
      const img = new Image()
      const objectUrl = URL.createObjectURL(file)
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = objectUrl
      })

      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || img.width
      canvas.height = img.naturalHeight || img.height
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) {
        throw new Error('Canvas unavailable')
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(objectUrl)

      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      })

      if (!code || !code.data) {
        setQrUploadError(
          'No QR code was detected in this image. Please upload a clear image containing the certificate QR code.',
        )
        return
      }

      const token = extractTokenFromQrData(code.data)
      setUserEnteredToken(token)
      setInputToken(token)
      navigate(`/verify/${token}`)
    } catch {
      setQrUploadError(
        'No QR code was detected in this image. Please upload a clear image containing the certificate QR code.',
      )
    } finally {
      setIsDecodingQr(false)
      if (e.target) e.target.value = ''
    }
  }

  function handleManualVerify(e: React.FormEvent) {
    e.preventDefault()
    const clean = inputToken.trim()
    if (!clean) return
    setUserEnteredToken(clean)
    navigate(`/verify/${clean}`)
  }

  function handleResetVerification() {
    stopCamera()
    setUserEnteredToken('')
    setInputToken('')
    setQrUploadError(null)
    navigate('/verify')
  }

  async function handleDisputeSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!farmerName.trim() || !farmerPhone.trim()) return
    setSubmitError(null)

    try {
      const res = await submitReviewRequest.mutateAsync({
        farmerName: farmerName.trim(),
        phoneNumber: farmerPhone.trim(),
        reasonCategory,
        comments: farmerComments.trim() || undefined,
      })
      setSubmissionResult(res)
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to submit review request.',
      )
    }
  }

  const transparency = verification?.farmerTransparency as
    | {
        lotId?: string
        inspectionDate?: string
        procurementCentre?: string
        sampleSize?: number
        finalGrade?: string
        aiGrade?: string
        overrideCount?: number
        defectSummary?: string
        verifiedStatus?: string
      }
    | undefined

  const whyThisGradeData = verification?.whyThisGrade || cert?.whyThisGrade
  const standardsMatrixData = verification?.standardsMatrix || cert?.standardsMatrix

  return (
    <>
      <PageHeader
        title="Certificate Verification"
        subtitle="Public authenticity & digital quality record"
        backTo={ROUTES.welcome}
      />
      <main className="flex flex-1 flex-col gap-4 px-4 py-4 max-w-xl mx-auto w-full">
        {/* Verification Entry Methods (Visible when no active verified token or when reset) */}
        {!activeToken ? (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-4">
            <div className="text-center">
              <div className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary mb-2">
                <ShieldCheck className="size-6" />
              </div>
              <h1 className="text-base font-bold text-foreground">
                Verify an ONIVIS Certificate
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Check the authenticity and inspection record of an ONIVIS certificate. No login required.
              </p>
            </div>

            {/* Method Tabs: Certificate ID vs Verify with QR */}
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-surface-muted p-1">
              <button
                type="button"
                onClick={() => {
                  stopCamera()
                  setActiveTab('id')
                }}
                className={cn(
                  'rounded-lg py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5',
                  activeTab === 'id'
                    ? 'bg-card text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <FileSearch className="size-3.5" />
                Certificate ID
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('qr')
                }}
                className={cn(
                  'rounded-lg py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5',
                  activeTab === 'qr'
                    ? 'bg-card text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <QrCode className="size-3.5" />
                Verify with QR
              </button>
            </div>

            {/* Method 1: Enter Certificate ID */}
            {activeTab === 'id' ? (
              <form onSubmit={handleManualVerify} className="space-y-3">
                <div>
                  <label htmlFor="cert-id" className="block text-xs font-semibold text-foreground mb-1">
                    Certificate ID or QR Token
                  </label>
                  <div className="relative">
                    <FileSearch className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
                    <input
                      id="cert-id"
                      type="text"
                      required
                      value={inputToken}
                      onChange={(e) => setInputToken(e.target.value)}
                      placeholder="e.g. cert-a0bfea5b or qr-cert-a0bfea5b"
                      className="w-full rounded-xl border border-border bg-surface-muted py-2.5 pl-9 pr-3 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <PrimaryButton type="submit" fullWidth disabled={!inputToken.trim()}>
                  Verify Certificate
                </PrimaryButton>
              </form>
            ) : null}

            {/* Method 2 & 3: Verify with QR (Scan with Camera or Upload QR Image) */}
            {activeTab === 'qr' ? (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    VERIFY WITH QR
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Scan a certificate QR code with your camera, or upload a saved QR image.
                  </p>
                </div>

                {cameraActive ? (
                  <div className="space-y-3 text-center">
                    <div className="relative overflow-hidden rounded-xl border border-border bg-black aspect-square max-w-xs mx-auto">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="size-full object-cover"
                      />
                      <div className="absolute inset-0 border-2 border-primary/60 pointer-events-none flex items-center justify-center">
                        <div className="size-44 border-2 border-dashed border-white rounded-lg animate-pulse" />
                      </div>
                    </div>
                    <SecondaryButton fullWidth onClick={stopCamera}>
                      Stop Camera
                    </SecondaryButton>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <PrimaryButton
                      type="button"
                      fullWidth
                      onClick={startCamera}
                    >
                      <Camera className="mr-1.5 size-4" />
                      Scan with Camera
                    </PrimaryButton>

                    <div className="relative flex items-center justify-center py-1">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border" />
                      </div>
                      <span className="relative bg-card px-2 text-[11px] font-medium text-muted-foreground uppercase">
                        or
                      </span>
                    </div>

                    <SecondaryButton
                      type="button"
                      fullWidth
                      onClick={() => qrFileInputRef.current?.click()}
                      disabled={isDecodingQr}
                    >
                      <Upload className="mr-1.5 size-4" />
                      {isDecodingQr ? 'Decoding QR Image…' : 'Upload QR Image'}
                    </SecondaryButton>

                    <input
                      ref={qrFileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,image/jpeg,image/png,image/jpg"
                      onChange={handleQrImageUpload}
                      className="hidden"
                    />
                  </div>
                )}

                {cameraError ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-center">
                    <p className="text-xs text-destructive">{cameraError}</p>
                  </div>
                ) : null}

                {qrUploadError ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-center">
                    <p className="text-xs text-destructive">{qrUploadError}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Public Tracking Entry Point */}
        {!activeToken ? (
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Track Re-audit Request
                </h2>
                <p className="text-xs text-muted-foreground">
                  Already submitted a re-audit request? Check its status and response.
                </p>
              </div>
              <SecondaryButton
                type="button"
                onClick={() => navigate(ROUTES.reAuditTrack)}
                className="text-xs shrink-0 whitespace-nowrap"
              >
                Track Request
              </SecondaryButton>
            </div>
          </div>
        ) : null}

        {/* Verification Result Display */}
        {activeToken ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                Query: <span className="font-mono text-foreground">{activeToken}</span>
              </span>
              <button
                type="button"
                onClick={handleResetVerification}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <RotateCcw className="size-3" />
                Verify another
              </button>
            </div>

            {verificationQuery.isPending ? (
              <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
                <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                <p className="text-xs font-medium text-muted-foreground">
                  Verifying certificate against ONIVIS verification service…
                </p>
              </div>
            ) : null}

            {verificationQuery.isError || (verification && !verification.valid) ? (
              <div className="flex flex-col items-center rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center shadow-soft">
                <XCircle className="size-12 text-destructive" aria-hidden />
                <h2 className="mt-3 text-base font-bold text-destructive">
                  Certificate Not Verified
                </h2>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                  We couldn't verify this certificate. Check the ID or upload the original report.
                </p>
                <SecondaryButton className="mt-4 text-xs" onClick={handleResetVerification}>
                  Try another Certificate ID
                </SecondaryButton>
              </div>
            ) : null}

            {verification && verification.valid && cert ? (
              <>
                {/* Authentic Verified Card */}
                <div className="flex flex-col items-center rounded-2xl border border-emerald-500/30 bg-emerald-50/40 p-6 text-center shadow-soft">
                  <CheckCircle2 className="size-12 text-emerald-600" aria-hidden />
                  <h2 className="mt-2 text-base font-bold text-slate-900">
                    Certificate Verified
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-600">
                    This record was verified against the ONIVIS verification service.
                  </p>
                  <span className="mt-2 rounded-full border border-emerald-300 bg-emerald-100 px-3 py-0.5 text-[11px] font-bold text-emerald-800">
                    {transparency?.verifiedStatus || 'VERIFIED RECORD • APMC MANDI REGISTRY'}
                  </span>
                </div>

                {/* Certificate Details Summary */}
                <div className="rounded-xl border border-border bg-card p-4 shadow-soft space-y-3">
                  <div className="flex items-center justify-between border-b border-border/80 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Official Certified Grade
                      </span>
                      <h3 className="text-base font-bold text-foreground">
                        {cert.officerGrade || cert.grade}
                      </h3>
                    </div>
                    <StatusBadge
                      status={
                        (cert.officerGrade || cert.grade).toLowerCase().includes('grade a')
                          ? 'grade_a'
                          : (cert.officerGrade || cert.grade).toLowerCase().includes('urs')
                            ? 'urs'
                            : 'rejected'
                      }
                      label={cert.officerGrade || cert.grade}
                    />
                  </div>

                  <dl className="space-y-2.5 text-xs">
                    <VerifyRow label="Certificate ID" value={cert.id} />
                    <VerifyRow label="Inspection ID" value={cert.inspectionId} />
                    <VerifyRow
                      label="Inspection Date"
                      value={new Date(cert.issuedAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    />
                    <VerifyRow label="Procurement Centre" value={cert.procurementCentre ?? '—'} />
                    <VerifyRow label="Lot / Specification" value={cert.specification ?? cert.batchLabel} />
                    <VerifyRow
                      label="Sample Size"
                      value={cert.sampleSize ? `${cert.sampleSize} onions` : '—'}
                    />
                    <VerifyRow
                      label="Inspector"
                      value={cert.inspectorName ?? 'Authorized Mandi Officer'}
                    />
                  </dl>

                  {cert.defectSummary ? (
                    <div className="rounded-lg border border-border bg-surface-muted p-2.5 mt-2">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                        Evidence / Defect Summary
                      </span>
                      <p className="text-xs text-foreground mt-0.5">{cert.defectSummary}</p>
                    </div>
                  ) : null}
                </div>

                {/* Audit Timeline */}
                {cert.auditTimeline && cert.auditTimeline.length > 0 ? (
                  <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
                    <h4 className="text-xs font-bold text-foreground mb-3 uppercase tracking-wider">
                      Cryptographic Audit Timeline
                    </h4>
                    <div className="space-y-2.5">
                      {cert.auditTimeline.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs">
                          <div className="size-2 rounded-full bg-primary mt-1 shrink-0" />
                          <div className="flex-1 flex justify-between gap-2">
                            <span className="font-medium text-foreground">{item.event}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(item.time).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Why this grade & standards drawer */}
                {whyThisGradeData ? (
                  <WhyThisGradeCard data={whyThisGradeData} compact />
                ) : null}

                {standardsMatrixData ? (
                  <StandardsMatrix items={standardsMatrixData} />
                ) : null}

                {/* Farmer Dispute Action */}
                <div className="pt-2 space-y-2">
                  <SecondaryButton
                    fullWidth
                    onClick={() => setShowDisputeModal(true)}
                    className="text-xs border-slate-300"
                  >
                    Request Independent Quality Re-audit
                  </SecondaryButton>
                  <div className="text-center pt-0.5">
                    <button
                      type="button"
                      onClick={() => navigate(ROUTES.reAuditTrack)}
                      className="text-[11px] text-muted-foreground hover:text-primary underline transition-colors"
                    >
                      Already submitted a re-audit request? Track it here.
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </>
        ) : null}

        {/* Dispute Request Modal */}
        {showDisputeModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-bold text-foreground text-sm">
                  Request Quality Re-Audit
                </h3>
                <button
                  type="button"
                  onClick={() => setShowDisputeModal(false)}
                  className="rounded-full p-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              {submissionResult ? (
                <div className="space-y-3.5 text-center py-2">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                    <CheckCircle2 className="size-7" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      Re-audit Request Submitted
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Save your Request ID to track your re-audit.
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-surface-muted p-3 text-left space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium">Request ID:</span>
                      <span className="font-mono font-bold text-primary text-sm">
                        {submissionResult.id}
                      </span>
                    </div>
                    {cert?.id ? (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground font-medium">Certificate:</span>
                        <span className="font-mono font-bold text-foreground">
                          {cert.id}
                        </span>
                      </div>
                    ) : null}
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium">Status:</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                        <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Pending
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium">Submitted:</span>
                      <span className="font-medium text-foreground">
                        {new Date().toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 pt-1">
                    <PrimaryButton
                      fullWidth
                      onClick={() => {
                        setShowDisputeModal(false)
                        navigate(
                          `${ROUTES.reAuditTrack}?id=${encodeURIComponent(
                            submissionResult.id,
                          )}&phone=${encodeURIComponent(farmerPhone.trim())}`,
                        )
                      }}
                      className="text-xs"
                    >
                      Track Re-audit Request
                    </PrimaryButton>
                    <SecondaryButton
                      fullWidth
                      onClick={() => setShowDisputeModal(false)}
                      className="text-xs"
                    >
                      Done
                    </SecondaryButton>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleDisputeSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={farmerName}
                      onChange={(e) => setFarmerName(e.target.value)}
                      placeholder="e.g. Kisan Suresh Patil"
                      className="w-full rounded-lg border border-border bg-surface-muted p-2 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={farmerPhone}
                      onChange={(e) => setFarmerPhone(e.target.value)}
                      placeholder="98XXXXXXXX"
                      className="w-full rounded-lg border border-border bg-surface-muted p-2 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Required for login-free tracking of your re-audit request.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Dispute Reason *
                    </label>
                    <select
                      value={reasonCategory}
                      onChange={(e) => setReasonCategory(e.target.value)}
                      className="w-full rounded-lg border border-border bg-surface-muted p-2 text-xs text-foreground focus:border-primary focus:outline-none"
                    >
                      {DISPUTE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Observations / Remarks
                    </label>
                    <textarea
                      rows={2}
                      value={farmerComments}
                      onChange={(e) => setFarmerComments(e.target.value)}
                      placeholder="Describe specific sample or grading discrepancies…"
                      className="w-full rounded-lg border border-border bg-surface-muted p-2 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  {submitError ? (
                    <p className="text-xs text-destructive">{submitError}</p>
                  ) : null}

                  <div className="flex gap-2 pt-2 border-t border-border">
                    <SecondaryButton
                      type="button"
                      className="flex-1 text-xs"
                      onClick={() => setShowDisputeModal(false)}
                    >
                      Cancel
                    </SecondaryButton>
                    <PrimaryButton
                      type="submit"
                      className="flex-1 text-xs"
                      disabled={
                        submitReviewRequest.isPending ||
                        !farmerName.trim() ||
                        !farmerPhone.trim() ||
                        farmerPhone.trim().replace(/\D/g, '').length < 10
                      }
                    >
                      {submitReviewRequest.isPending ? 'Submitting…' : 'Submit Request'}
                    </PrimaryButton>
                  </div>
                </form>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </>
  )
}

function VerifyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-border/50 pb-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  )
}
