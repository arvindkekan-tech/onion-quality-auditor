import { useQuery } from '@tanstack/react-query'

import { getCertificate, verifyCertificate } from '@/lib/api/certificates'

export const certificateKeys = {
  detail: (id: string) => ['certificates', id] as const,
  verify: (token: string) => ['verify', token] as const,
}

export function useCertificate(id: string) {
  return useQuery({
    queryKey: certificateKeys.detail(id),
    queryFn: () => getCertificate(id),
    enabled: Boolean(id),
  })
}

export function useVerifyCertificate(token: string) {
  return useQuery({
    queryKey: certificateKeys.verify(token),
    queryFn: () => verifyCertificate(token),
    enabled: Boolean(token),
  })
}
