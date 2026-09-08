import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  checkImageQuality,
  createInspection,
  deleteInspection,
  getAdaptiveRecommendations,
  getInspectionHistory,
  getAnalysisStatus,
  getInspectionResults,
  recalculateInspection,
  startAnalysis,
  submitFarmerReviewRequest,
  submitReview,
  uploadImage,
} from '@/lib/api/inspections'
import type {
  CreateInspectionInput,
  OnionDecision,
  ReviewInput,
  ReviewRequestInput,
} from '@/types/inspection'

export const inspectionKeys = {
  all: ['inspections'] as const,
  history: () => ['inspections', 'history'] as const,
  analysis: (id: string) => ['inspections', id, 'analysis'] as const,
  results: (id: string) => ['inspections', id, 'results'] as const,
}

export function useInspectionHistory() {
  return useQuery({
    queryKey: inspectionKeys.history(),
    queryFn: getInspectionHistory,
  })
}

export function useDeleteInspection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (inspectionId: string) => deleteInspection(inspectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.all })
    },
  })
}

export function useCreateInspection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateInspectionInput) => createInspection(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.all })
    },
  })
}

export function useUploadImage(inspectionId: string) {
  return useMutation({
    mutationFn: (file: File) => uploadImage(inspectionId, file),
  })
}

export function useCheckImageQuality(inspectionId: string, imageId: string) {
  return useMutation({
    mutationFn: () => checkImageQuality(inspectionId, imageId),
  })
}

export function useStartAnalysis(inspectionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => startAnalysis(inspectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: inspectionKeys.analysis(inspectionId),
      })
    },
  })
}

export function useAnalysisStatus(inspectionId: string, enabled = true) {
  return useQuery({
    queryKey: inspectionKeys.analysis(inspectionId),
    queryFn: () => getAnalysisStatus(inspectionId),
    enabled: Boolean(inspectionId) && enabled,
    retry: 15,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    refetchInterval: (query) =>
      query.state.data?.status === 'completed' ||
      query.state.data?.status === 'failed'
        ? false
        : 2500,
  })
}

export function useInspectionResults(inspectionId: string, enabled = true) {
  return useQuery({
    queryKey: inspectionKeys.results(inspectionId),
    queryFn: () => getInspectionResults(inspectionId),
    enabled: Boolean(inspectionId) && enabled,
  })
}

export function useSubmitReview(inspectionId: string) {
  return useMutation({
    mutationFn: (input: ReviewInput) => submitReview(inspectionId, input),
  })
}

export function useRecalculateInspection(inspectionId: string) {
  return useMutation({
    mutationFn: (decisions: OnionDecision[]) =>
      recalculateInspection(inspectionId, decisions),
  })
}

export function useAdaptiveRecommendations(inspectionId: string, enabled = true) {
  return useQuery({
    queryKey: ['inspections', inspectionId, 'adaptive-recommendations'] as const,
    queryFn: () => getAdaptiveRecommendations(inspectionId),
    enabled: Boolean(inspectionId) && enabled,
  })
}

export function useSubmitFarmerReviewRequest(inspectionId: string) {
  return useMutation({
    mutationFn: (input: ReviewRequestInput) =>
      submitFarmerReviewRequest(inspectionId, input),
  })
}

