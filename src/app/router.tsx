import { createBrowserRouter } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { AnalyticsPage } from '@/features/analytics'
import { DashboardPage } from '@/features/dashboard'
import { InspectionsPage } from '@/features/inspections-list'
import { NewInspectionPage } from '@/features/new-inspection'
import { ImageCapturePage } from '@/features/image-capture'
import { ImageQualityCheckPage } from '@/features/image-quality-check'
import { AiAnalysisPage } from '@/features/ai-analysis'
import { InspectionResultsPage } from '@/features/inspection-results'
import { HumanReviewPage } from '@/features/human-review'
import { QualityCertificatePage } from '@/features/quality-certificate'
import { QrVerificationPage } from '@/features/qr-verification'
import { ProfilePage } from '@/features/profile'
import { ROUTES } from '@/lib/constants'

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: ROUTES.dashboard, element: <DashboardPage /> },
      { path: ROUTES.inspections, element: <InspectionsPage /> },
      { path: ROUTES.newInspection, element: <NewInspectionPage /> },
      { path: ROUTES.analytics, element: <AnalyticsPage /> },
      { path: ROUTES.profile, element: <ProfilePage /> },
      { path: '/inspection/:id/capture', element: <ImageCapturePage /> },
      { path: '/inspection/:id/quality', element: <ImageQualityCheckPage /> },
      { path: '/inspection/:id/analysis', element: <AiAnalysisPage /> },
      { path: '/inspection/:id/results', element: <InspectionResultsPage /> },
      { path: '/inspection/:id/review', element: <HumanReviewPage /> },
      { path: '/certificate/:id', element: <QualityCertificatePage /> },
      { path: '/verify/:token', element: <QrVerificationPage /> },
    ],
  },
])
