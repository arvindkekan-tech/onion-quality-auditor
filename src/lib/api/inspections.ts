import { z } from 'zod'

import { apiClient } from '@/lib/api/client'
import { useMockApi } from '@/lib/api/config'
import * as mock from '@/lib/api/mock/inspections.mock'
import type {
  AdaptiveInsight,
  AnalysisStatusResponse,
  CreateInspectionInput,
  ImageQualityResult,
  Inspection,
  InspectionHistoryItem,
  InspectionImage,
  InspectionResult,
  OnionDecision,
  RecalculateResponse,
  ReviewInput,
  ReviewRequestInput,
  ReviewRequestResponse,
  ReviewResponse,
} from '@/types/inspection'
import {
  analysisStatusResponseSchema,
  imageQualityResultSchema,
  inspectionImageSchema,
  inspectionHistoryItemSchema,
  inspectionResultSchema,
  inspectionSchema,
  recalculateResponseSchema,
  reviewRequestResponseSchema,
  reviewResponseSchema,
} from '@/types/inspection'

export async function getInspectionHistory(): Promise<InspectionHistoryItem[]> {
  return apiClient.get('/inspections', z.array(inspectionHistoryItemSchema))
}

export async function deleteInspection(inspectionId: string): Promise<void> {
  await apiClient.delete(`/inspections/${inspectionId}`)
}

export async function createInspection(
  input: CreateInspectionInput,
): Promise<Inspection> {
  if (useMockApi) return mock.mockCreateInspection(input)
  return apiClient.post('/inspections', input, inspectionSchema)
}

export async function uploadImage(
  inspectionId: string,
  file: File,
): Promise<InspectionImage> {
  if (useMockApi) return mock.mockUploadImage(inspectionId, file)

  const buffer = await file.arrayBuffer()
  const inMemoryBlob = new Blob([new Uint8Array(buffer)], {
    type: file.type || 'image/jpeg',
  })
  const formData = new FormData()
  formData.append('file', inMemoryBlob, file.name || 'sample_onion_tray.jpg')
  return apiClient.post(
    `/inspections/${inspectionId}/images`,
    formData,
    inspectionImageSchema,
  )
}

export async function checkImageQuality(
  inspectionId: string,
  imageId: string,
): Promise<ImageQualityResult> {
  if (useMockApi) return mock.mockCheckImageQuality(inspectionId, imageId)
  return apiClient.post(
    `/inspections/${inspectionId}/images/${imageId}/quality-check`,
    undefined,
    imageQualityResultSchema,
  )
}

export async function startAnalysis(
  inspectionId: string,
): Promise<AnalysisStatusResponse> {
  if (useMockApi) return mock.mockStartAnalysis(inspectionId)
  return apiClient.post(
    `/inspections/${inspectionId}/analyze`,
    undefined,
    analysisStatusResponseSchema,
  )
}

export async function getAnalysisStatus(
  inspectionId: string,
): Promise<AnalysisStatusResponse> {
  if (useMockApi) return mock.mockGetAnalysisStatus(inspectionId)
  return apiClient.get(
    `/inspections/${inspectionId}/analysis-status`,
    analysisStatusResponseSchema,
  )
}

export async function getInspectionResults(
  inspectionId: string,
): Promise<InspectionResult> {
  if (useMockApi) return mock.mockGetInspectionResults(inspectionId)
  return apiClient.get(
    `/inspections/${inspectionId}/results`,
    inspectionResultSchema,
  )
}

export async function submitReview(
  inspectionId: string,
  input: ReviewInput,
): Promise<ReviewResponse> {
  if (useMockApi) return mock.mockSubmitReview(inspectionId, input)
  return apiClient.patch(
    `/inspections/${inspectionId}/review`,
    input,
    reviewResponseSchema,
  )
}

export async function recalculateInspection(
  inspectionId: string,
  decisions: OnionDecision[],
): Promise<RecalculateResponse> {
  return apiClient.post(
    `/inspections/${inspectionId}/recalculate`,
    { onionDecisions: decisions },
    recalculateResponseSchema,
  )
}

export async function getAdaptiveRecommendations(
  inspectionId: string,
): Promise<{ recommendations: Record<string, AdaptiveInsight> }> {
  return apiClient.get(`/inspections/${inspectionId}/adaptive-recommendations`)
}

export async function submitFarmerReviewRequest(
  inspectionId: string,
  input: ReviewRequestInput,
): Promise<ReviewRequestResponse> {
  return apiClient.post(
    `/inspections/${inspectionId}/request-review`,
    input,
    reviewRequestResponseSchema,
  )
}
