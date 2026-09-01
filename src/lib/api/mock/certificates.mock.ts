import type { Certificate, VerificationResult } from '@/types/certificate'
import { certificateSchema, verificationResultSchema } from '@/types/certificate'

const certificates = new Map<string, Certificate>()

function delay(ms = 600) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function mockGetCertificate(id: string): Promise<Certificate> {
  await delay()
  const existing = certificates.get(id)
  if (existing) {
    return certificateSchema.parse(existing)
  }

  const certificate: Certificate = {
    id,
    inspectionId: `insp-${id}`,
    grade: 'Grade A',
    issuedAt: new Date().toISOString(),
    batchLabel: 'Demo Batch — Nashik Red Onion',
    qrToken: `qr-${id}`,
    inspectorName: 'Demo Inspector',
  }

  certificates.set(id, certificate)
  return certificateSchema.parse(certificate)
}

export async function mockVerifyCertificate(
  token: string,
): Promise<VerificationResult> {
  await delay()

  if (token.startsWith('invalid')) {
    return verificationResultSchema.parse({
      valid: false,
      message: 'Certificate not found or has been revoked.',
    })
  }

  const certificate: Certificate = {
    id: `cert-${token}`,
    inspectionId: `insp-${token}`,
    grade: 'Grade A',
    issuedAt: new Date().toISOString(),
    batchLabel: 'Demo Batch — Nashik Red Onion',
    qrToken: token,
    inspectorName: 'Demo Inspector',
  }

  return verificationResultSchema.parse({
    valid: true,
    certificate,
    message: 'Certificate is valid.',
  })
}

export function mockStoreCertificate(certificate: Certificate) {
  certificates.set(certificate.id, certificate)
}
