import { z } from 'zod'

export const certificateSchema = z.object({
  id: z.string(),
  inspectionId: z.string(),
  grade: z.string(),
  issuedAt: z.string(),
  batchLabel: z.string(),
  qrToken: z.string(),
  inspectorName: z.string().optional(),
  batchId: z.string().optional(),
  procurementCentre: z.string().optional(),
  specification: z.string().optional(),
  sampleSize: z.number().optional(),
  confidence: z.number().optional(),
  defectSummary: z.string().optional(),
})

export const auditEventSchema = z.object({
  event: z.string(),
  time: z.string(),
})

export type AuditEvent = z.infer<typeof auditEventSchema>

export type Certificate = z.infer<typeof certificateSchema>

export const verificationResultSchema = z.object({
  valid: z.boolean(),
  certificate: certificateSchema.optional(),
  message: z.string(),
  auditTimeline: z.array(auditEventSchema).optional(),
})

export type VerificationResult = z.infer<typeof verificationResultSchema>
