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

export const imageAnalysisSummarySchema = z.object({
  imageId: z.string(),
  filename: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  annotatedImageUrl: z.string().nullable().optional(),
  totalOnions: z.number().default(0),
  healthyCount: z.number().default(0),
  rottenDamagedCount: z.number().default(0),
  sproutedCount: z.number().default(0),
  uncertainCount: z.number().default(0),
})

export type ImageAnalysisSummary = z.infer<typeof imageAnalysisSummarySchema>

export const onionDecisionSchema = z.object({
  onionId: z.string(),
  imageId: z.string().optional(),
  aiClass: z.string(),
  officerClass: z.string(),
  finalClass: z.string().optional(),
  aiSize: z.string().optional(),
  officerSize: z.string().optional(),
  finalSize: z.string().optional(),
  reason: z.string().optional(),
  officerName: z.string().optional(),
})

export type OnionDecision = z.infer<typeof onionDecisionSchema>

export const attentionQueueItemSchema = z.object({
  id: z.string(),
  onionId: z
    .union([z.string(), z.number()])
    .transform((v) => String(v))
    .nullable()
    .optional(),
  imageId: z.string().nullable().optional(),
  severity: z.enum(['high', 'medium', 'low']).default('medium'),
  title: z.string(),
  reason: z.string(),
  recommendation: z.string(),
})

export type AttentionQueueItem = z.infer<typeof attentionQueueItemSchema>

export const standardsMatrixItemSchema = z.object({
  parameter: z.string(),
  detectionMethod: z.string(),
  evidenceStatus: z.string(),
  procurementThreshold: z.string(),
  measuredValue: z.string(),
  compliant: z.boolean().nullable().optional(),
  requiresManualCheck: z.boolean().default(false),
})

export type StandardsMatrixItem = z.infer<typeof standardsMatrixItemSchema>

export const whyThisGradeSchema = z.object({
  sampleSize: z.number().default(0),
  healthyCount: z.number().default(0),
  healthyPct: z.number().default(0),
  defectsCount: z.number().default(0),
  defectPct: z.number().default(0),
  rottenDamagedCount: z.number().default(0),
  sproutedCount: z.number().default(0),
  uncertainCount: z.number().default(0),
  grade: z.string(),
  gradeCode: z.string().optional(),
  officerOverridesCount: z.number().default(0),
  narrative: z.string(),
  thresholds: z.record(z.string(), z.string()).optional(),
})

export type WhyThisGrade = z.infer<typeof whyThisGradeSchema>

export const adaptiveInsightSchema = z.object({
  hasAdaptiveInsight: z.boolean(),
  similarCasesCount: z.number().default(0),
  correctedCount: z.number().default(0),
  fromClass: z.string().nullable().optional(),
  toClass: z.string().nullable().optional(),
  insightText: z.string().nullable().optional(),
  recommendation: z.string().nullable().optional(),
  commonReasons: z.array(z.string()).nullable().optional(),
})

export type AdaptiveInsight = z.infer<typeof adaptiveInsightSchema>

export const reviewRequestInputSchema = z.object({
  farmerName: z.string().min(1),
  phoneNumber: z.string().nullable().optional(),
  reasonCategory: z.string().min(1),
  comments: z.string().nullable().optional(),
})

export type ReviewRequestInput = z.infer<typeof reviewRequestInputSchema>

export const reviewRequestResponseSchema = z.object({
  id: z.string(),
  inspectionId: z.string(),
  farmerName: z.string(),
  reasonCategory: z.string(),
  status: z.string(),
  createdAt: z.string(),
  message: z.string().nullable().optional(),
})

export type ReviewRequestResponse = z.infer<typeof reviewRequestResponseSchema>

export const inspectionResultSchema = z.object({
  inspectionId: z.string(),
  grade: z.string(),
  confidence: z.number(),
  defects: z.array(
    z.object({
      label: z.string(),
      count: z.number(),
      category: z.string().optional(),
    }),
  ),
  summary: z.string(),
  analyzedAt: z.string(),
  totalOnions: z.number().nullable().optional(),
  modelName: z.string().nullable().optional(),
  classification: z.string().nullable().optional(),
  healthyCount: z.number().nullable().optional(),
  rottenDamagedCount: z.number().nullable().optional(),
  sproutedCount: z.number().nullable().optional(),
  uncertainCount: z.number().nullable().optional(),
  annotatedImageUrl: z.string().nullable().optional(),
  annotatedImagePath: z.string().nullable().optional(),
  detections: z.array(z.record(z.string(), z.any())).nullable().optional(),
  gradeExplanation: z.string().nullable().optional(),
  attentionRequired: z.boolean().optional(),
  attentionReason: z.string().nullable().optional(),
  sizeEstimation: z.record(z.string(), z.any()).nullable().optional(),
  imagesResults: z.array(imageAnalysisSummarySchema).nullable().optional(),
  aiAssessment: z.record(z.string(), z.any()).nullable().optional(),
  officerAssessment: z.record(z.string(), z.any()).nullable().optional(),
  attentionQueue: z.array(attentionQueueItemSchema).nullable().optional(),
  whyThisGrade: whyThisGradeSchema.nullable().optional(),
  standardsMatrix: z.array(standardsMatrixItemSchema).nullable().optional(),
})

export type InspectionResult = z.infer<typeof inspectionResultSchema>

export const inspectionSchema = z.object({
  id: z.string(),
  variety: z.string(),
  weightKg: z.number(),
  location: z.string(),
  createdAt: z.string(),
  status: z.string(),
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
  onionDecisions: z.array(onionDecisionSchema).nullable().optional(),
})

export type ReviewInput = z.infer<typeof reviewInputSchema>

export const reviewResponseSchema = z.object({
  inspectionId: z.string(),
  certificateId: z.string().nullable().optional(),
  approved: z.boolean(),
  notes: z.string().nullable().optional(),
  overrideGrade: z.string().nullable().optional(),
  overrideCount: z.number().optional(),
  finalGrade: z.string().nullable().optional(),
})

export type ReviewResponse = z.infer<typeof reviewResponseSchema>

export const recalculateResponseSchema = z.object({
  totalOnions: z.number(),
  healthyCount: z.number(),
  rottenDamagedCount: z.number(),
  sproutedCount: z.number(),
  uncertainCount: z.number(),
  defectRatio: z.number().optional(),
  healthyPct: z.number().optional(),
  rottenPct: z.number().optional(),
  sproutedPct: z.number().optional(),
  uncertainPct: z.number().optional(),
  grade: z.string(),
  gradeExplanation: z.string().optional(),
  overrideCount: z.number().default(0),
  whyThisGrade: whyThisGradeSchema.nullable().optional(),
  standardsMatrix: z.array(standardsMatrixItemSchema).nullable().optional(),
  ai_grade: z.string().optional(),
  officer_grade: z.string().optional(),
  healthy_count: z.number().optional(),
  rotten_damaged_count: z.number().optional(),
  sprouted_count: z.number().optional(),
  uncertain_count: z.number().optional(),
  defect_percentage: z.number().optional(),
  override_count: z.number().optional(),
  explanation: z.string().optional(),
})

export type RecalculateResponse = z.infer<typeof recalculateResponseSchema>

