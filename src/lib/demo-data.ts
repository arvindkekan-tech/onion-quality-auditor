export const APP_NAME = 'ONIVIS'
export const APP_TAGLINE = 'AI-Assisted Onion Quality Inspection'
export const APP_INSTITUTION = 'Agricultural Procurement Quality System'
export const MODEL_NAME = 'ONIVIS Vision Model'

export const PROCUREMENT_CENTRES = [
  'Lasalgaon APMC',
  'Pimpalgaon Baswant',
  'Yeola APMC',
  'Manmad APMC',
] as const

export const dashboardMetrics = {
  inspectionsToday: 12,
  batchesAudited: 847,
  averageGradeA: 78,
  pendingReviews: 3,
}

export type InspectionListItem = {
  id: string
  batchId: string
  centre: string
  dateTime: string
  status: 'completed' | 'pending_review' | 'in_progress' | 'rejected'
  grade: string
  sampleCount: number
}

export const recentInspections: InspectionListItem[] = [
  {
    id: 'insp-demo-1',
    batchId: 'OKB-2024-1847',
    centre: 'Lasalgaon APMC',
    dateTime: '2024-11-28T09:42:00',
    status: 'pending_review',
    grade: 'Grade A',
    sampleCount: 48,
  },
  {
    id: 'insp-demo-2',
    batchId: 'OKB-2024-1846',
    centre: 'Pimpalgaon Baswant',
    dateTime: '2024-11-28T08:15:00',
    status: 'completed',
    grade: 'URS',
    sampleCount: 52,
  },
  {
    id: 'insp-demo-3',
    batchId: 'OKB-2024-1845',
    centre: 'Yeola APMC',
    dateTime: '2024-11-27T16:30:00',
    status: 'completed',
    grade: 'Grade A',
    sampleCount: 45,
  },
  {
    id: 'insp-demo-4',
    batchId: 'OKB-2024-1844',
    centre: 'Manmad APMC',
    dateTime: '2024-11-27T14:10:00',
    status: 'rejected',
    grade: 'Rejected',
    sampleCount: 40,
  },
]

export const pendingReviewInspections = recentInspections.filter(
  (item) => item.status === 'pending_review',
)

export const qualityChecksTemplate = [
  {
    key: 'sharpness',
    label: 'Sharpness / Focus',
    explanation: 'Edges of onion bulbs are clearly defined.',
  },
  {
    key: 'lighting',
    label: 'Lighting Uniformity',
    explanation: 'Even illumination across the sample tray.',
  },
  {
    key: 'coverage',
    label: 'Sample Coverage',
    explanation: 'Minimum 80% of frame occupied by sample.',
  },
  {
    key: 'contrast',
    label: 'Colour Contrast',
    explanation: 'Sufficient contrast for defect detection.',
  },
] as const

export const analysisSteps = [
  'Detecting onion bulbs',
  'Segmenting individual bulbs',
  'Measuring apparent size',
  'Detecting visible defects',
  'Applying procurement rules',
] as const

export const visuallyAssessableDefects = [
  'Undersized',
  'Mechanical Damage',
  'External Rot',
  'Sprouted',
  'Surface Discoloration',
  'Split / Cracked',
  'Oversized',
] as const

export const labVerificationDefects = [
  'Internal rot',
  'Moisture content',
  'Firmness',
  'Microbial contamination',
] as const

export const VISUAL_DISCLAIMER =
  'This assessment evaluates visible characteristics from camera images. Parameters such as internal rot, moisture, firmness and microbial contamination require appropriate physical or laboratory verification.'

export const AI_ADVISORY_NOTE =
  'AI suggestions are advisory. Final classification remains with the human inspector.'

export const reviewCasesTemplate = [
  {
    id: 'case-1',
    defect: 'Sprouted',
    confidence: 0.87,
    suggestion: 'Grade A — minor sprouting within tolerance',
    imageLabel: 'Sample region A',
  },
  {
    id: 'case-2',
    defect: 'Mechanical Damage',
    confidence: 0.92,
    suggestion: 'URS — visible surface damage',
    imageLabel: 'Sample region B',
  },
  {
    id: 'case-3',
    defect: 'Undersized',
    confidence: 0.78,
    suggestion: 'Uncertain — borderline size',
    imageLabel: 'Sample region C',
  },
  {
    id: 'case-4',
    defect: 'Surface Discoloration',
    confidence: 0.85,
    suggestion: 'Grade A — cosmetic only',
    imageLabel: 'Sample region D',
  },
] as const

export type ReviewDecision = 'accept' | 'override' | 'uncertain'

export const analyticsData = {
  averageGradeA: 78,
  averageRejected: 8,
  lowConfidenceRate: 12,
  bestCentre: 'Lasalgaon APMC',
  gradeATrend: [72, 74, 76, 75, 78, 79, 78],
  rejectedTrend: [12, 10, 9, 11, 8, 7, 8],
  centreBreakdown: [
    { centre: 'Lasalgaon APMC', gradeA: 82, rejected: 6, inspections: 312 },
    { centre: 'Pimpalgaon Baswant', gradeA: 76, rejected: 9, inspections: 198 },
    { centre: 'Yeola APMC', gradeA: 74, rejected: 10, inspections: 176 },
    { centre: 'Manmad APMC', gradeA: 71, rejected: 12, inspections: 161 },
  ],
}

export const profileData = {
  name: 'Rajesh Patil',
  role: 'Procurement Inspector',
  centre: 'Lasalgaon APMC',
  monthlyInspections: 47,
  averageGradeA: 79,
  aiAccuracy: 91,
  appVersion: '1.0.0',
  aiModel: MODEL_NAME,
  specificationDatabase: 'ONIVIS Spec v2024.3',
  lastSync: '2024-11-28T09:30:00',
  offlineData: '12 inspections cached',
}

export const captureConditions = [
  { key: 'lighting', label: 'Lighting', description: 'Even, diffused light' },
  { key: 'focus', label: 'Focus / Sharpness', description: 'No motion blur' },
  { key: 'coverage', label: 'Sample Coverage', description: 'Full tray visible' },
  { key: 'overlap', label: 'Overlap Detection', description: 'Minimal bulb overlap' },
] as const

export const auditTimelineTemplate = [
  { event: 'Inspection completed', time: '2024-11-28T09:42:00' },
  { event: 'AI analysis verified', time: '2024-11-28T09:45:00' },
  { event: 'Human review approved', time: '2024-11-28T09:52:00' },
  { event: 'Certificate issued', time: '2024-11-28T09:53:00' },
]
