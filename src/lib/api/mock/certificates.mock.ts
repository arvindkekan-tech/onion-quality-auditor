import { auditTimelineTemplate } from '@/lib/demo-data'
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
    batchId: 'OKB-2024-1847',
    grade: 'Grade A',
    issuedAt: new Date().toISOString(),
    batchLabel: 'OKB-2024-1847 — Lasalgaon APMC',
    procurementCentre: 'Lasalgaon APMC',
    specification: 'Export Grade — Nashik Red',
    sampleSize: 48,
    confidence: 0.91,
    defectSummary: '2 sprouted, 3 mechanical damage (within tolerance)',
    qrToken: `qr-${id}`,
    inspectorName: 'Rajesh Patil',
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
    batchId: 'OKB-2024-1847',
    grade: 'Grade A',
    issuedAt: new Date().toISOString(),
    batchLabel: 'OKB-2024-1847 — Lasalgaon APMC',
    procurementCentre: 'Lasalgaon APMC',
    specification: 'Export Grade — Nashik Red',
    sampleSize: 48,
    confidence: 0.91,
    defectSummary: '2 sprouted, 3 mechanical damage (within tolerance)',
    qrToken: token,
    inspectorName: 'Rajesh Patil',
  }

  return verificationResultSchema.parse({
    valid: true,
    certificate,
    message: 'Certificate is valid and has not been revoked.',
    auditTimeline: auditTimelineTemplate,
  })
}

export function mockStoreCertificate(certificate: Certificate) {
  certificates.set(certificate.id, certificate)
}
