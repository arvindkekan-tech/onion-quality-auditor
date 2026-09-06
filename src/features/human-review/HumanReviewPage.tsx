import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CheckCircle2,
  Edit3,
  RotateCcw,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react'

import { InspectionStepLayout } from '@/components/layout/InspectionStepLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  AlertBanner,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
} from '@/components/shared'
import {
  useInspectionResults,
  useRecalculateInspection,
  useSubmitReview,
} from '@/features/inspections/hooks'
import { AI_ADVISORY_NOTE } from '@/lib/demo-data'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useInspectionDraftStore } from '@/stores/inspectionDraftStore'
import type { OnionDecision, RecalculateResponse } from '@/types/inspection'

interface DetectionItem {
  id?: string
  onion_id?: string
  image_id?: string
  display_label?: string
  final_class?: string
  classification_confidence?: number
  estimated_diameter_mm?: number
  size_category?: string
  bbox?: number[]
}

const REASON_PRESETS = [
  'Surface blemish only — sound flesh underneath',
  'Deep rot / internal decay confirmed upon inspection',
  'Early sprout emergence confirmed',
  'AI misclassification correction',
  'Size measurement calibration correction',
  'Borderline quality — approved under procurement tolerance',
  'Other inspector observation',
]

export function HumanReviewPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const resultsQuery = useInspectionResults(id)
  const submitReview = useSubmitReview(id)
  const recalculateMutation = useRecalculateInspection(id)
  const previewUrl = useInspectionDraftStore((s) => s.previewUrl)

  const results = resultsQuery.data
  const [notes, setNotes] = useState('')
  const [overrideGrade, setOverrideGrade] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Onion override state
  const [onionDecisions, setOnionDecisions] = useState<Record<string, OnionDecision>>({})
  const [selectedOnion, setSelectedOnion] = useState<DetectionItem | null>(null)
  const [filterTab, setFilterTab] = useState<'all' | 'healthy' | 'defects'>('all')

  // Modal editing state
  const [modalClass, setModalClass] = useState<string>('healthy')
  const [modalSize, setModalSize] = useState<string>('Medium')
  const [modalReason, setModalReason] = useState<string>(REASON_PRESETS[0])
  const [modalCustomReason, setModalCustomReason] = useState<string>('')

  const imageSrc = results?.annotatedImageUrl || previewUrl

  const detections: DetectionItem[] = useMemo(() => {
    return (results?.detections as DetectionItem[]) || []
  }, [results?.detections])

  // Real-time calculation from client side + backend recalculation sync
  const liveMetrics = useMemo(() => {
    const total = detections.length || results?.totalOnions || 0
    if (total === 0) {
      return {
        healthy: results?.healthyCount ?? 0,
        rottenDamaged: results?.rottenDamagedCount ?? 0,
        sprouted: results?.sproutedCount ?? 0,
        uncertain: results?.uncertainCount ?? 0,
        defectPercentage: 0,
        grade: results?.grade || 'Pending',
        overrideCount: 0,
      }
    }

    let healthy = 0
    let rottenDamaged = 0
    let sprouted = 0
    let uncertain = 0

    detections.forEach((det, idx) => {
      const onionId = String(det.id || det.onion_id || `onion-${idx + 1}`)
      const effectiveClass =
        onionDecisions[onionId]?.officerClass || det.final_class || 'healthy'

      if (effectiveClass === 'healthy') healthy += 1
      else if (effectiveClass === 'rotten_damaged') rottenDamaged += 1
      else if (effectiveClass === 'sprouted') sprouted += 1
      else uncertain += 1
    })

    const defects = rottenDamaged + sprouted
    const defectPercentage = total > 0 ? (defects / total) * 100 : 0
    const overrideCount = Object.keys(onionDecisions).length

    let calculatedGrade = 'Pending'
    if (defectPercentage <= 5.0) calculatedGrade = 'Grade A'
    else if (defectPercentage <= 15.0) calculatedGrade = 'URS'
    else calculatedGrade = 'Rejected'

    return {
      healthy,
      rottenDamaged,
      sprouted,
      uncertain,
      defectPercentage: Math.round(defectPercentage * 10) / 10,
      grade: calculatedGrade,
      overrideCount,
    }
  }, [detections, onionDecisions, results])

  const backendRecalc = recalculateMutation.data as RecalculateResponse | undefined

  const effectiveOfficerGrade =
    overrideGrade ||
    backendRecalc?.officer_grade ||
    liveMetrics.grade ||
    results?.grade ||
    'Pending'

  const effectiveHealthy =
    backendRecalc?.healthy_count ?? liveMetrics.healthy
  const effectiveDefects =
    backendRecalc !== undefined
      ? backendRecalc.rotten_damaged_count + backendRecalc.sprouted_count
      : liveMetrics.rottenDamaged + liveMetrics.sprouted
  const effectiveDefectPercentage =
    backendRecalc?.defect_percentage ?? liveMetrics.defectPercentage
  const overrideCount =
    backendRecalc?.override_count ?? liveMetrics.overrideCount

  const aiDefectRate = useMemo(() => {
    const total = results?.totalOnions || detections.length || 1
    const defects = (results?.rottenDamagedCount ?? 0) + (results?.sproutedCount ?? 0)
    return Math.round((defects / total) * 1000) / 10
  }, [results, detections])

  function openOverrideModal(onion: DetectionItem, idx: number) {
    const onionId = String(onion.id || onion.onion_id || `onion-${idx + 1}`)
    const existing = onionDecisions[onionId]
    setModalClass(existing?.officerClass || onion.final_class || 'healthy')
    setModalSize(existing?.officerSize || onion.size_category || 'Medium')
    setModalReason(
      existing?.reason && REASON_PRESETS.includes(existing.reason)
        ? existing.reason
        : REASON_PRESETS[0],
    )
    setModalCustomReason(
      existing?.reason && !REASON_PRESETS.includes(existing.reason)
        ? existing.reason
        : '',
    )
    setSelectedOnion(onion)
  }

  function handleSaveOverride() {
    if (!selectedOnion) return
    const idx = detections.indexOf(selectedOnion)
    const onionId = String(
      selectedOnion.id || selectedOnion.onion_id || `onion-${idx + 1}`,
    )
    const reason = modalCustomReason.trim() || modalReason

    const nextDecisions: Record<string, OnionDecision> = {
      ...onionDecisions,
      [onionId]: {
        onionId,
        imageId: selectedOnion.image_id,
        aiClass: selectedOnion.final_class || 'healthy',
        officerClass: modalClass,
        finalClass: modalClass,
        aiSize: selectedOnion.size_category || 'Medium',
        officerSize: modalSize,
        finalSize: modalSize,
        reason,
        officerName: 'Authorized Officer',
      },
    }

    setOnionDecisions(nextDecisions)
    setSelectedOnion(null)
    void recalculateMutation.mutateAsync(Object.values(nextDecisions))
  }

  function handleRemoveOverride(onionId: string) {
    const nextDecisions = { ...onionDecisions }
    delete nextDecisions[onionId]
    setOnionDecisions(nextDecisions)
    setSelectedOnion(null)
    if (Object.keys(nextDecisions).length > 0) {
      void recalculateMutation.mutateAsync(Object.values(nextDecisions))
    } else {
      recalculateMutation.reset()
    }
  }

  async function handleReview(approved: boolean) {
    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      const response = await submitReview.mutateAsync({
        approved,
        notes:
          notes.trim() ||
          (approved
            ? `Inspector approved batch quality as ${effectiveOfficerGrade}`
            : 'Inspector rejected batch during quality review'),
        overrideGrade: effectiveOfficerGrade || undefined,
        onionDecisions: Object.values(onionDecisions),
      })

      if (approved && response.certificateId) {
        navigate(ROUTES.certificate(response.certificateId))
      } else {
        navigate(ROUTES.inspectionResults(id))
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit review'
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredDetections = useMemo(() => {
    return detections.filter((det, idx) => {
      const onionId = String(det.id || det.onion_id || `onion-${idx + 1}`)
      const currentClass =
        onionDecisions[onionId]?.officerClass || det.final_class || 'healthy'

      if (filterTab === 'healthy') return currentClass === 'healthy'
      if (filterTab === 'defects') return currentClass !== 'healthy'
      return true
    })
  }, [detections, onionDecisions, filterTab])

  const aiGradeBadgeStatus =
    (results?.grade || '').toLowerCase().includes('grade a')
      ? 'grade_a'
      : (results?.grade || '').toLowerCase().includes('urs')
        ? 'urs'
        : 'rejected'

  const officerGradeBadgeStatus =
    effectiveOfficerGrade.toLowerCase().includes('grade a')
      ? 'grade_a'
      : effectiveOfficerGrade.toLowerCase().includes('urs')
        ? 'urs'
        : 'rejected'

  return (
    <>
      <PageHeader
        title="Human Review"
        subtitle="Individual onion audit & final certification"
        backTo={ROUTES.inspectionResults(id)}
      />
      <InspectionStepLayout currentStep="review">
        <div className="space-y-4">
          <AlertBanner variant="info" title="Inspector Authority">
            {AI_ADVISORY_NOTE}
          </AlertBanner>

          {resultsQuery.isPending ? (
            <p className="text-sm text-muted-foreground">Loading inspection data…</p>
          ) : null}

          {results ? (
            <>
              {/* Dual Quality Assessment Card */}
              <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-soft">
                <div className="flex items-center justify-between border-b border-border/80 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Dual Quality Assessment
                    </span>
                    <h3 className="text-sm font-bold text-foreground">
                      AI Recommendation vs Officer Final Assessment
                    </h3>
                  </div>
                  {overrideCount > 0 ? (
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      {overrideCount} Override{overrideCount > 1 ? 's' : ''} Active
                    </span>
                  ) : (
                    <span className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      AI Baseline
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* AI Track */}
                  <div className="rounded-xl border border-border bg-surface-muted p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        AI Initial
                      </span>
                      <StatusBadge status={aiGradeBadgeStatus} label={results.grade} />
                    </div>
                    <p className="mt-1.5 text-xl font-extrabold text-foreground">
                      {results.grade}
                    </p>
                    <div className="mt-2 space-y-1 border-t border-border/60 pt-2 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Defect Rate:</span>
                        <span className="font-semibold text-foreground">
                          {aiDefectRate}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Healthy:</span>
                        <span>{results.healthyCount ?? 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Defects:</span>
                        <span>
                          {(results.rottenDamagedCount ?? 0) +
                            (results.sproutedCount ?? 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Officer Final Track */}
                  <div className="rounded-xl border-2 border-primary/40 bg-card p-3 shadow-soft">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-primary">
                        Officer Final
                      </span>
                      <StatusBadge
                        status={officerGradeBadgeStatus}
                        label={effectiveOfficerGrade}
                      />
                    </div>
                    <p className="mt-1.5 text-xl font-extrabold text-foreground">
                      {effectiveOfficerGrade}
                    </p>
                    <div className="mt-2 space-y-1 border-t border-border/60 pt-2 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Defect Rate:</span>
                        <span className="font-bold text-foreground">
                          {effectiveDefectPercentage}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Healthy:</span>
                        <span>{effectiveHealthy}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Defects:</span>
                        <span>{effectiveDefects}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {backendRecalc?.explanation ? (
                  <p className="rounded-lg border border-border bg-surface-muted p-2.5 text-xs text-muted-foreground">
                    {backendRecalc.explanation}
                  </p>
                ) : results.gradeExplanation ? (
                  <p className="rounded-lg border border-border bg-surface-muted p-2.5 text-xs text-muted-foreground">
                    {results.gradeExplanation}
                  </p>
                ) : null}
              </div>

              {/* Annotated Image Visualization */}
              {imageSrc ? (
                <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
                  <img
                    src={imageSrc}
                    alt="Inspection analysis overlay"
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
                    <span>YOLO Bounding Box & Class Overlays</span>
                    <span>Confidence: {((results.confidence ?? 0) * 100).toFixed(1)}%</span>
                  </div>
                </div>
              ) : null}

              {/* Individual Bulb Audit & Overrides */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Detected Bulbs Audit ({detections.length})
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Click any detected bulb to audit or override classification
                    </p>
                  </div>
                  {overrideCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setOnionDecisions({})
                        recalculateMutation.reset()
                      }}
                      className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-destructive"
                    >
                      <RotateCcw className="size-3" />
                      Reset All
                    </button>
                  ) : null}
                </div>

                {/* Filter Tabs */}
                <div className="flex rounded-lg border border-border bg-surface-muted p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterTab('all')}
                    className={cn(
                      'flex-1 rounded-md py-1.5 font-medium transition-colors',
                      filterTab === 'all'
                        ? 'bg-card font-semibold text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    All ({detections.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab('healthy')}
                    className={cn(
                      'flex-1 rounded-md py-1.5 font-medium transition-colors',
                      filterTab === 'healthy'
                        ? 'bg-card font-semibold text-success shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    Healthy ({effectiveHealthy})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab('defects')}
                    className={cn(
                      'flex-1 rounded-md py-1.5 font-medium transition-colors',
                      filterTab === 'defects'
                        ? 'bg-card font-semibold text-destructive shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    Defects ({effectiveDefects})
                  </button>
                </div>

                {/* Onions List */}
                <div className="space-y-2">
                  {filteredDetections.length > 0 ? (
                    filteredDetections.map((detection) => {
                      const idx = detections.indexOf(detection)
                      const onionId = String(
                        detection.id || detection.onion_id || `onion-${idx + 1}`,
                      )
                      const override = onionDecisions[onionId]
                      const effectiveClass =
                        override?.officerClass || detection.final_class || 'healthy'
                      const isOverridden = Boolean(override)

                      const badgeBg =
                        effectiveClass === 'healthy'
                          ? 'bg-success'
                          : effectiveClass === 'rotten_damaged'
                            ? 'bg-destructive'
                            : effectiveClass === 'sprouted'
                              ? 'bg-amber-600'
                              : 'bg-blue-600'

                      return (
                        <div
                          key={`${detection.image_id || 'tray'}_${onionId}_${idx}`}
                          onClick={() => openOverrideModal(detection, idx)}
                          className={cn(
                            'flex cursor-pointer items-center justify-between rounded-xl border p-3 text-sm shadow-soft transition-colors hover:border-primary/50',
                            isOverridden
                              ? 'border-primary/40 bg-primary/5'
                              : 'border-border bg-card',
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white',
                                badgeBg,
                              )}
                            >
                              {detection.display_label || `#${idx + 1}`}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold capitalize text-foreground">
                                  {effectiveClass.replace('_', ' ')}
                                </span>
                                {isOverridden ? (
                                  <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                                    Overridden
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                AI: {detection.final_class?.replace('_', ' ') || 'healthy'} (
                                {typeof detection.classification_confidence === 'number'
                                  ? `${(detection.classification_confidence * 100).toFixed(0)}%`
                                  : '—'}
                                ) • Size:{' '}
                                {override?.officerSize ||
                                  (detection.estimated_diameter_mm
                                    ? `${detection.estimated_diameter_mm}mm`
                                    : detection.size_category || 'Medium')}
                              </p>
                              {isOverridden ? (
                                <p className="mt-0.5 text-[10px] italic text-primary">
                                  Reason: {override.reason}
                                </p>
                              ) : null}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              openOverrideModal(detection, idx)
                            }}
                            className="flex items-center gap-1 rounded-lg border border-border bg-surface-muted px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                          >
                            <Edit3 className="size-3" />
                            {isOverridden ? 'Edit' : 'Override'}
                          </button>
                        </div>
                      )
                    })
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success/5 p-4 text-xs text-success">
                      <CheckCircle2 className="size-4 shrink-0" />
                      <span>No onions found for this filter tab.</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Inspector Override & Notes */}
              <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-soft">
                <label className="block text-xs font-medium text-foreground">
                  Official Grade Adjustment (Optional Override)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: '', label: `Computed (${effectiveOfficerGrade})` },
                    { value: 'Grade A', label: 'Grade A' },
                    { value: 'URS', label: 'URS' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setOverrideGrade(opt.value)}
                      className={cn(
                        'min-h-10 rounded-lg border text-xs font-medium transition-colors',
                        overrideGrade === opt.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-surface-muted text-muted-foreground hover:bg-muted',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5 pt-1">
                  <label
                    htmlFor="inspector-notes"
                    className="block text-xs font-medium text-foreground"
                  >
                    Inspector Notes / Remarks
                  </label>
                  <textarea
                    id="inspector-notes"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add observations, moisture notes, or dispatch instructions…"
                    className="w-full rounded-lg border border-border bg-surface-muted p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {errorMessage ? (
                <AlertBanner variant="error" title="Review submission failed">
                  {errorMessage}
                </AlertBanner>
              ) : null}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <PrimaryButton
                  fullWidth
                  disabled={isSubmitting}
                  onClick={() => handleReview(true)}
                  className="gap-2"
                >
                  <ShieldCheck className="size-4" />
                  {isSubmitting
                    ? 'Issuing certificate…'
                    : `Approve & Issue Certificate (${effectiveOfficerGrade})`}
                </PrimaryButton>

                <SecondaryButton
                  fullWidth
                  disabled={isSubmitting}
                  onClick={() => handleReview(false)}
                  className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="size-4" />
                  Reject Batch (No Certificate)
                </SecondaryButton>
              </div>
            </>
          ) : null}
        </div>
      </InspectionStepLayout>

      {/* Individual Onion Override Modal */}
      {selectedOnion ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-foreground text-sm">
                  Audit Onion {selectedOnion.display_label || `#${detections.indexOf(selectedOnion) + 1}`}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  AI: {selectedOnion.final_class?.replace('_', ' ')} • Conf:{' '}
                  {typeof selectedOnion.classification_confidence === 'number'
                    ? `${(selectedOnion.classification_confidence * 100).toFixed(1)}%`
                    : '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOnion(null)}
                className="rounded-full p-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                aria-label="Close dialog"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Classification selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Final Quality Classification
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'healthy', label: 'Healthy', color: 'border-success text-success bg-success/10' },
                  { key: 'rotten_damaged', label: 'Rotten / Damaged', color: 'border-destructive text-destructive bg-destructive/10' },
                  { key: 'sprouted', label: 'Sprouted', color: 'border-amber-500 text-amber-600 bg-amber-500/10' },
                  { key: 'uncertain', label: 'Uncertain', color: 'border-blue-500 text-blue-600 bg-blue-500/10' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setModalClass(item.key)}
                    className={cn(
                      'rounded-lg border p-2 text-xs font-semibold text-left transition-all',
                      modalClass === item.key
                        ? cn(item.color, 'ring-2 ring-primary/20')
                        : 'border-border bg-surface-muted text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Size selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Size Category
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['Small (<45mm)', 'Medium (45-65mm)', 'Large (>65mm)'].map((size) => {
                  const sizeKey = size.split(' ')[0]
                  return (
                    <button
                      key={sizeKey}
                      type="button"
                      onClick={() => setModalSize(sizeKey)}
                      className={cn(
                        'rounded-lg border p-2 text-[11px] font-medium text-center transition-all',
                        modalSize === sizeKey
                          ? 'border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary'
                          : 'border-border bg-surface-muted text-muted-foreground hover:bg-muted',
                      )}
                    >
                      {size}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Reason for override */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Reason for Override (Audit Log)
              </label>
              <select
                value={modalReason}
                onChange={(e) => setModalReason(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-muted p-2 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                {REASON_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {preset}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Or enter custom observation..."
                value={modalCustomReason}
                onChange={(e) => setModalCustomReason(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-muted p-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none mt-1"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2 border-t border-border">
              {onionDecisions[
                String(
                  selectedOnion.id ||
                    selectedOnion.onion_id ||
                    `onion-${detections.indexOf(selectedOnion) + 1}`,
                )
              ] ? (
                <SecondaryButton
                  className="text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                  onClick={() =>
                    handleRemoveOverride(
                      String(
                        selectedOnion.id ||
                          selectedOnion.onion_id ||
                          `onion-${detections.indexOf(selectedOnion) + 1}`,
                      ),
                    )
                  }
                >
                  Remove Override
                </SecondaryButton>
              ) : (
                <SecondaryButton
                  className="flex-1 text-xs"
                  onClick={() => setSelectedOnion(null)}
                >
                  Cancel
                </SecondaryButton>
              )}
              <PrimaryButton
                className="flex-1 text-xs"
                onClick={handleSaveOverride}
              >
                Apply Override
              </PrimaryButton>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

