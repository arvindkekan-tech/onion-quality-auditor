export const ROUTES = {
  dashboard: '/',
  newInspection: '/inspection/new',
  imageCapture: (id: string) => `/inspection/${id}/capture`,
  imageQuality: (id: string) => `/inspection/${id}/quality`,
  aiAnalysis: (id: string) => `/inspection/${id}/analysis`,
  inspectionResults: (id: string) => `/inspection/${id}/results`,
  humanReview: (id: string) => `/inspection/${id}/review`,
  certificate: (id: string) => `/certificate/${id}`,
  verify: (token: string) => `/verify/${token}`,
} as const

export const INSPECTION_STEPS = [
  { key: 'new', label: 'New Inspection' },
  { key: 'capture', label: 'Image Capture' },
  { key: 'quality', label: 'Quality Check' },
  { key: 'analysis', label: 'AI Analysis' },
  { key: 'results', label: 'Results' },
  { key: 'review', label: 'Human Review' },
  { key: 'certificate', label: 'Certificate' },
] as const

export type InspectionStepKey = (typeof INSPECTION_STEPS)[number]['key']
