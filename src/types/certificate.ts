import { z } from 'zod'

export const certificateSchema = z.object({
  id: z.string(),
  inspectionId: z.string(),
  grade: z.string(),
  issuedAt: z.string(),
  batchLabel: z.string(),
  qrToken: z.string(),
  inspectorName: z.string().optional(),
})

export type Certificate = z.infer<typeof certificateSchema>

export const verificationResultSchema = z.object({
  valid: z.boolean(),
  certificate: certificateSchema.optional(),
  message: z.string(),
})

export type VerificationResult = z.infer<typeof verificationResultSchema>
