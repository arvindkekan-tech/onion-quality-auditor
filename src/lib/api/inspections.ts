import { apiClient } from '@/lib/api/client'
import { useMockApi } from '@/lib/api/config'
import * as mock from '@/lib/api/mock/inspections.mock'
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

  const formData = new FormData()
  formData.append('file', file)
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
