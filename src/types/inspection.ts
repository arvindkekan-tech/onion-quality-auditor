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
  url: z.string().nullable().optional(),
  uploadedAt: z.string(),
})

export type InspectionImage = z.infer<typeof inspectionImageSchema>

export const imageQualityResultSchema = z.object({
  imageId: z.string(),
  passed: z.boolean(),
  issues: z.array(z.string()),
  score: z.number().nullable().optional(),
  checks: z
    .array(
      z.object({
        key: z.string(),
        label: z.string(),
        score: z.number(),
        passed: z.boolean(),
        explanation: z.string(),
      }),
    )
    .nullable()
    .optional(),
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
      category: z.enum(['visual', 'lab']).optional(),
    }),
  ),
  summary: z.string(),
  analyzedAt: z.string(),
  totalOnions: z.number().nullable().optional(),
  modelName: z.string().nullable().optional(),
  classification: z.enum(['grade_a', 'urs', 'rejected']).nullable().optional(),
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

export const inspectionHistoryItemSchema = z.object({
  id: z.string(),
  variety: z.string(),
  location: z.string(),
  createdAt: z.string(),
  status: z.string(),
  grade: z.string().nullable().optional(),
  totalOnions: z.number().int().nullable().optional(),
  imageId: z.string().nullable().optional(),
  analysisStatus: analysisStatusSchema.nullable().optional(),
  certificateId: z.string().nullable().optional(),
  reviewSubmitted: z.boolean(),
})

export type InspectionHistoryItem = z.infer<
  typeof inspectionHistoryItemSchema
>

export const createInspectionInputSchema = z.object({
  variety: z.string().min(1),
  weightKg: z.number().positive(),
  location: z.string().min(1),
})

export type CreateInspectionInput = z.infer<typeof createInspectionInputSchema>

export const analysisStatusResponseSchema = z.object({
  inspectionId: z.string(),
  status: analysisStatusSchema,
  progress: z.number().min(0).max(100).nullable().optional(),
  message: z.string().nullable().optional(),
})

export type AnalysisStatusResponse = z.infer<
  typeof analysisStatusResponseSchema
>

export const reviewInputSchema = z.object({
  approved: z.boolean(),
  notes: z.string().nullable().optional(),
  overrideGrade: z.string().nullable().optional(),
})

export type ReviewInput = z.infer<typeof reviewInputSchema>

export const reviewResponseSchema = z.object({
  inspectionId: z.string(),
  certificateId: z.string(),
  approved: z.boolean(),
  notes: z.string().nullable().optional(),
})

export type ReviewResponse = z.infer<typeof reviewResponseSchema>
