import { mockStoreCertificate } from '@/lib/api/mock/certificates.mock'
import { MODEL_NAME, qualityChecksTemplate } from '@/lib/demo-data'
import type {
  AnalysisStatusResponse,
  CreateInspectionInput,
  ImageQualityResult,
  Inspection,
  InspectionImage,
  InspectionResult,
  ReviewInput,
  ReviewResponse,
} from '@/types/inspection'
import {
  analysisStatusResponseSchema,
  imageQualityResultSchema,
  inspectionImageSchema,
  inspectionResultSchema,
  inspectionSchema,
  reviewResponseSchema,
} from '@/types/inspection'
import type { Certificate } from '@/types/certificate'

const inspections = new Map<string, Inspection>()
const images = new Map<string, InspectionImage[]>()
const analysisState = new Map<
  string,
  { startedAt: number; pollCount: number }
>()
const results = new Map<string, InspectionResult>()

function delay(ms = 600) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

export async function mockCreateInspection(
  input: CreateInspectionInput,
): Promise<Inspection> {
  await delay()
  const inspection: Inspection = {
    id: createId('insp'),
    variety: input.variety,
    weightKg: input.weightKg,
    location: input.location,
    createdAt: new Date().toISOString(),
    status: 'draft',
  }
  inspections.set(inspection.id, inspection)
  images.set(inspection.id, [])
  return inspectionSchema.parse(inspection)
}

export async function mockUploadImage(
  inspectionId: string,
  _file: File,
): Promise<InspectionImage> {
  await delay(800)
  const image: InspectionImage = {
    id: createId('img'),
    uploadedAt: new Date().toISOString(),
  }
  const list = images.get(inspectionId) ?? []
  list.push(image)
  images.set(inspectionId, list)

  const inspection = inspections.get(inspectionId)
  if (inspection) {
    inspections.set(inspectionId, { ...inspection, status: 'in_progress' })
  }

  return inspectionImageSchema.parse(image)
}

export async function mockCheckImageQuality(
  _inspectionId: string,
  imageId: string,
): Promise<ImageQualityResult> {
  await delay()
  return imageQualityResultSchema.parse({
    imageId,
    passed: true,
    issues: [],
    score: 92,
    checks: qualityChecksTemplate.map((check, index) => ({
      key: check.key,
      label: check.label,
      score: [94, 88, 91, 86][index] ?? 90,
      passed: index !== 3,
      explanation: check.explanation,
    })),
  })
}

export async function mockStartAnalysis(
  inspectionId: string,
): Promise<AnalysisStatusResponse> {
  await delay()
  analysisState.set(inspectionId, { startedAt: Date.now(), pollCount: 0 })
  return analysisStatusResponseSchema.parse({
    inspectionId,
    status: 'pending',
    progress: 0,
    message: 'Analysis queued.',
  })
}

export async function mockGetAnalysisStatus(
  inspectionId: string,
): Promise<AnalysisStatusResponse> {
  await delay(400)
  const state = analysisState.get(inspectionId)
  if (!state) {
    return analysisStatusResponseSchema.parse({
      inspectionId,
      status: 'pending',
      progress: 0,
      message: 'Waiting to start analysis.',
    })
  }

  state.pollCount += 1
  analysisState.set(inspectionId, state)

  if (state.pollCount < 2) {
    return analysisStatusResponseSchema.parse({
      inspectionId,
      status: 'processing',
      progress: 35,
      message: 'Running quality model…',
    })
  }

  if (state.pollCount < 4) {
    return analysisStatusResponseSchema.parse({
      inspectionId,
      status: 'processing',
      progress: 75,
      message: 'Aggregating defect signals…',
    })
  }

  const result: InspectionResult = {
    inspectionId,
    grade: 'Grade A',
    confidence: 0.91,
    classification: 'grade_a',
    totalOnions: 48,
    modelName: MODEL_NAME,
    defects: [
      { label: 'Sprouted', count: 2, category: 'visual' },
      { label: 'Mechanical Damage', count: 3, category: 'visual' },
      { label: 'Undersized', count: 1, category: 'visual' },
      { label: 'Surface Discoloration', count: 4, category: 'visual' },
      { label: 'External Rot', count: 0, category: 'visual' },
      { label: 'Split / Cracked', count: 1, category: 'visual' },
      { label: 'Oversized', count: 0, category: 'visual' },
    ],
    summary:
      'Batch meets Grade A procurement thresholds. Minor visible defects within tolerance.',
    analyzedAt: new Date().toISOString(),
  }
  results.set(inspectionId, result)

  return analysisStatusResponseSchema.parse({
    inspectionId,
    status: 'completed',
    progress: 100,
    message: 'Analysis complete.',
  })
}

export async function mockGetInspectionResults(
  inspectionId: string,
): Promise<InspectionResult> {
  await delay()
  const existing = results.get(inspectionId)
  if (!existing) {
    throw new Error('Results not available yet. Complete analysis first.')
  }
  return inspectionResultSchema.parse(existing)
}

export async function mockSubmitReview(
  inspectionId: string,
  input: ReviewInput,
): Promise<ReviewResponse> {
  await delay()
  const certificateId = createId('cert')
  const inspection = inspections.get(inspectionId)

  const certificate: Certificate = {
    id: certificateId,
    inspectionId,
    batchId: 'OKB-2024-1847',
    grade: input.overrideGrade ?? results.get(inspectionId)?.grade ?? 'Grade A',
    issuedAt: new Date().toISOString(),
    batchLabel: inspection
      ? `${inspection.variety} — ${inspection.location}`
      : 'Inspection batch',
    procurementCentre: inspection?.location,
    specification: inspection?.variety,
    sampleSize: 48,
    confidence: results.get(inspectionId)?.confidence,
    defectSummary: 'Reviewed and approved by inspector',
    qrToken: `qr-${certificateId}`,
    inspectorName: 'Rajesh Patil',
  }

  mockStoreCertificate(certificate)

  if (inspection) {
    inspections.set(inspectionId, { ...inspection, status: 'reviewed' })
  }

  return reviewResponseSchema.parse({
    inspectionId,
    certificateId,
    approved: input.approved,
    notes: input.notes,
  })
}
