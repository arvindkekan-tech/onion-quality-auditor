import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  checkImageQuality,
  createInspection,
  getAnalysisStatus,
  getInspectionResults,
  startAnalysis,
  submitReview,
  uploadImage,
} from '@/lib/api/inspections'
import type {
  CreateInspectionInput,
  ReviewInput,
} from '@/types/inspection'

export const inspectionKeys = {
  all: ['inspections'] as const,
  analysis: (id: string) => ['inspections', id, 'analysis'] as const,
  results: (id: string) => ['inspections', id, 'results'] as const,
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
    refetchInterval: (query) =>
      query.state.data?.status === 'completed' ||
      query.state.data?.status === 'failed'
        ? false
        : 1500,
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
