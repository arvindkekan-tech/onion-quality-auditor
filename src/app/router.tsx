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
import { LandingPage } from '@/features/landing'
import { ReAuditRequestsPage, ReAuditTrackingPage } from '@/features/re-audits'
import {
  LoginPage,
  SignUpPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  ProtectedRoute,
} from '@/features/auth'
import { ROUTES } from '@/lib/constants'

export const router = createBrowserRouter([
  // Public Routes (Landing, Auth, QR Verification, Re-audit Tracking)
  { path: ROUTES.welcome, element: <LandingPage /> },
  { path: ROUTES.login, element: <LoginPage /> },
  { path: ROUTES.signup, element: <SignUpPage /> },
  { path: ROUTES.forgotPassword, element: <ForgotPasswordPage /> },
  { path: ROUTES.resetPassword, element: <ResetPasswordPage /> },
  { path: '/verify', element: <QrVerificationPage /> },
  { path: '/verify/:token', element: <QrVerificationPage /> },
  { path: ROUTES.reAuditTrack, element: <ReAuditTrackingPage /> },
  { path: '/re-audit/track', element: <ReAuditTrackingPage /> },

  // Public Inspection Flow (Accessible via Quick Start / Start New Inspection without login)
  {
    element: <AppShell />,
    children: [
      { path: ROUTES.newInspection, element: <NewInspectionPage /> },
      { path: '/inspection/:id/capture', element: <ImageCapturePage /> },
      { path: '/inspection/:id/quality', element: <ImageQualityCheckPage /> },
      { path: '/inspection/:id/analysis', element: <AiAnalysisPage /> },
      { path: '/inspection/:id/results', element: <InspectionResultsPage /> },
    ],
  },

  // Protected Routes (AppShell + ProtectedRoute for authenticated APMC officers)
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: ROUTES.dashboard, element: <DashboardPage /> },
          { path: '/dashboard', element: <DashboardPage /> },
          { path: ROUTES.reAudits, element: <ReAuditRequestsPage /> },
          { path: ROUTES.inspections, element: <InspectionsPage /> },
          { path: ROUTES.analytics, element: <AnalyticsPage /> },
          { path: ROUTES.profile, element: <ProfilePage /> },
          { path: '/inspection/:id/review', element: <HumanReviewPage /> },
          { path: '/certificate/:id', element: <QualityCertificatePage /> },
        ],
      },
    ],
  },
])

