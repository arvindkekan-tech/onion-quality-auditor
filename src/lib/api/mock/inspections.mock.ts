import {
  mockStoreCertificate,
} from '@/lib/api/mock/certificates.mock'
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
    defects: [
      { label: 'Sprouting', count: 1 },
      { label: 'Surface damage', count: 2 },
    ],
    summary: 'Batch meets export quality thresholds with minor surface defects.',
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
    grade: input.overrideGrade ?? results.get(inspectionId)?.grade ?? 'Grade A',
    issuedAt: new Date().toISOString(),
    batchLabel: inspection
      ? `${inspection.variety} — ${inspection.location}`
      : 'Inspection batch',
    qrToken: `qr-${certificateId}`,
    inspectorName: 'Demo Inspector',
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
