import { z } from 'zod'

export const analysisStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
])

export type AnalysisStatus = z.infer<typeof analysisStatusSchema>

export const inspectionImageSchema = z.object({
  id: z.string(),
  url: z.string().optional(),
  uploadedAt: z.string(),
})

export type InspectionImage = z.infer<typeof inspectionImageSchema>

export const imageQualityResultSchema = z.object({
  imageId: z.string(),
  passed: z.boolean(),
  issues: z.array(z.string()),
  score: z.number().optional(),
})

export type ImageQualityResult = z.infer<typeof imageQualityResultSchema>

export const inspectionResultSchema = z.object({
  inspectionId: z.string(),
  grade: z.string(),
  confidence: z.number(),
  defects: z.array(
    z.object({
      label: z.string(),
      count: z.number(),
    }),
  ),
  summary: z.string(),
  analyzedAt: z.string(),
})

export type InspectionResult = z.infer<typeof inspectionResultSchema>

export const inspectionSchema = z.object({
  id: z.string(),
  variety: z.string(),
  weightKg: z.number(),
  location: z.string(),
  createdAt: z.string(),
  status: z.enum(['draft', 'in_progress', 'completed', 'reviewed']),
})

export type Inspection = z.infer<typeof inspectionSchema>

export const createInspectionInputSchema = z.object({
  variety: z.string().min(1),
  weightKg: z.number().positive(),
  location: z.string().min(1),
})

export type CreateInspectionInput = z.infer<typeof createInspectionInputSchema>

export const analysisStatusResponseSchema = z.object({
  inspectionId: z.string(),
  status: analysisStatusSchema,
  progress: z.number().min(0).max(100).optional(),
  message: z.string().optional(),
})

export type AnalysisStatusResponse = z.infer<
  typeof analysisStatusResponseSchema
>

export const reviewInputSchema = z.object({
  approved: z.boolean(),
  notes: z.string().optional(),
  overrideGrade: z.string().optional(),
})

export type ReviewInput = z.infer<typeof reviewInputSchema>

export const reviewResponseSchema = z.object({
  inspectionId: z.string(),
  certificateId: z.string(),
  approved: z.boolean(),
  notes: z.string().optional(),
})

export type ReviewResponse = z.infer<typeof reviewResponseSchema>
