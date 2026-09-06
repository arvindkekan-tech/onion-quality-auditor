export const ROUTES = {
  welcome: '/welcome',
  login: '/login',
  signup: '/signup',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  dashboard: '/',
  inspections: '/inspections',
  newInspection: '/inspection/new',
  analytics: '/analytics',
  profile: '/profile',
  imageCapture: (id: string) => `/inspection/${id}/capture`,
  imageQuality: (id: string) => `/inspection/${id}/quality`,
  aiAnalysis: (id: string) => `/inspection/${id}/analysis`,
  inspectionResults: (id: string) => `/inspection/${id}/results`,
  humanReview: (id: string) => `/inspection/${id}/review`,
  certificate: (id: string) => `/certificate/${id}`,
  verify: (token: string) => `/verify/${token}`,
} as const

export const INSPECTION_STEPS = [
  { key: 'batch', label: 'Batch', shortLabel: 'Batch' },
  { key: 'capture', label: 'Capture', shortLabel: 'Capture' },
  { key: 'quality', label: 'Quality', shortLabel: 'Quality' },
  { key: 'detect', label: 'Detect', shortLabel: 'Detect' },
  { key: 'results', label: 'Results', shortLabel: 'Results' },
  { key: 'review', label: 'Review', shortLabel: 'Review' },
  { key: 'report', label: 'Report', shortLabel: 'Report' },
] as const

export type InspectionStepKey = (typeof INSPECTION_STEPS)[number]['key']

export const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', path: ROUTES.dashboard },
  { key: 'inspections', label: 'Inspections', path: ROUTES.inspections },
  { key: 'new', label: 'New', path: ROUTES.newInspection, primary: true },
  { key: 'analytics', label: 'Analytics', path: ROUTES.analytics },
  { key: 'profile', label: 'Profile', path: ROUTES.profile },
] as const

export function isInspectionFlowPath(pathname: string) {
  return (
    pathname.startsWith('/inspection/') ||
    pathname.startsWith('/certificate/') ||
    pathname.startsWith('/verify/')
  )
}
