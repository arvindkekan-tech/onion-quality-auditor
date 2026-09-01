import { apiClient } from '@/lib/api/client'
import { useMockApi } from '@/lib/api/config'
import * as mock from '@/lib/api/mock/certificates.mock'
import type { Certificate, VerificationResult } from '@/types/certificate'
import { certificateSchema, verificationResultSchema } from '@/types/certificate'

export async function getCertificate(id: string): Promise<Certificate> {
  if (useMockApi) return mock.mockGetCertificate(id)
  return apiClient.get(`/certificates/${id}`, certificateSchema)
}

export async function verifyCertificate(
  token: string,
): Promise<VerificationResult> {
  if (useMockApi) return mock.mockVerifyCertificate(token)
  return apiClient.get(`/verify/${token}`, verificationResultSchema)
}
