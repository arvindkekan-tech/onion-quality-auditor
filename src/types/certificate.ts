import { z } from 'zod'

export const qualityCompositionSchema = z.object({
  totalOnions: z.number().nullable().optional(),
  gradeAPercent: z.number().nullable().optional(),
  ursPercent: z.number().nullable().optional(),
  undersizedCount: z.number().nullable().optional(),
  rottenDamagedCount: z.number().nullable().optional(),
  sproutedCount: z.number().nullable().optional(),
})

export type QualityComposition = z.infer<typeof qualityCompositionSchema>

export const certificateSchema = z.object({
  id: z.string(),
  inspectionId: z.string(),
  grade: z.string(),
  issuedAt: z.string(),
  batchLabel: z.string(),
  qrToken: z.string(),
  inspectorName: z.string().nullable().optional(),
  batchId: z.string().nullable().optional(),
  procurementCentre: z.string().nullable().optional(),
  specification: z.string().nullable().optional(),
  sampleSize: z.number().nullable().optional(),
  confidence: z.number().nullable().optional(),
  defectSummary: z.string().nullable().optional(),
  aiGrade: z.string().nullable().optional(),
  officerGrade: z.string().nullable().optional(),
  overrideCount: z.number().optional(),
  dualAssessment: z.record(z.string(), z.any()).nullable().optional(),
  whyThisGrade: z.record(z.string(), z.any()).nullable().optional(),
  standardsMatrix: z.array(z.record(z.string(), z.any())).nullable().optional(),
  qualityComposition: qualityCompositionSchema.nullable().optional(),
  auditTimeline: z
    .array(
      z.object({
        event: z.string(),
        time: z.string(),
      }),
    )
    .nullable()
    .optional(),
})

export const auditEventSchema = z.object({
  event: z.string(),
  time: z.string(),
})

export type AuditEvent = z.infer<typeof auditEventSchema>

export type Certificate = z.infer<typeof certificateSchema>

export const verificationResultSchema = z.object({
  valid: z.boolean(),
  certificate: certificateSchema.nullable().optional(),
  message: z.string(),
  auditTimeline: z.array(auditEventSchema).nullable().optional(),
  whyThisGrade: z.record(z.string(), z.any()).nullable().optional(),
  standardsMatrix: z.array(z.record(z.string(), z.any())).nullable().optional(),
  farmerTransparency: z.record(z.string(), z.any()).nullable().optional(),
  qualityComposition: qualityCompositionSchema.nullable().optional(),
})

export type VerificationResult = z.infer<typeof verificationResultSchema>

