import { Link } from 'react-router-dom'
import {
  ArrowRight,
  FileCheck2,
  Layers,
  QrCode,
  Scale,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react'

import { PrimaryButton } from '@/components/shared/PrimaryButton'
import { SecondaryButton } from '@/components/shared/SecondaryButton'
import { useAuthStore } from '@/stores/authStore'

export function LandingPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Banner */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-sm">
              ON
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-slate-900 leading-none">ONIVIS</div>
              <div className="text-[10px] text-slate-500 font-medium leading-tight">APMC Quality Inspection</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Link to="/">
                <PrimaryButton className="h-8 px-3 text-xs">Open Dashboard →</PrimaryButton>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <SecondaryButton className="h-8 px-3 text-xs">Officer Sign In</SecondaryButton>
                </Link>
                <Link to="/inspection/new">
                  <PrimaryButton className="h-8 px-3 text-xs">Quick Start</PrimaryButton>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="px-4 py-12 md:py-20 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 mb-6">
            <Sparkles className="size-3.5 text-emerald-600" />
            Commercial AI Vision for Agricultural Procurement
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
            Automated Onion Quality Auditing for Mandis & APMCs
          </h1>

          <p className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto mb-8 leading-relaxed">
            Eliminate subjective manual grading. ONIVIS combines multi-tray computer vision with real YOLO models, optical defect detection, physical size estimation, and dual-track human review to issue tamper-proof digital certificates.
          </p>

          <div className="flex items-center justify-center">
            <Link to="/inspection/new" className="w-full sm:w-auto">
              <PrimaryButton fullWidth className="min-w-56 h-12 text-sm font-semibold shadow-md">
                Start New Inspection
                <ArrowRight className="ml-2 size-4" />
              </PrimaryButton>
            </Link>
          </div>
        </section>

        {/* Commercial Grading Standards */}
        <section className="px-4 py-10 bg-white border-y border-slate-200">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">National APMC Onion Quality Grades</h2>
              <p className="text-xs md:text-sm text-slate-500 mt-1">Standard commercial grading thresholds according to procurement regulations</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Premium Export</span>
                  <span className="inline-flex size-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">A</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">Grade A (Extra Class)</h3>
                <p className="text-xs text-slate-600 mb-3">Uniform shape, intact skin, 0% sprouted, defect ratio ≤ 5.0%.</p>
                <div className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/60 rounded px-2 py-0.5 inline-block">Highest Mandi Value</div>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Standard Domestic</span>
                  <span className="inline-flex size-6 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-xs font-bold">B</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">Grade B (Good Quality)</h3>
                <p className="text-xs text-slate-600 mb-3">Sound dry skins, slight cosmetic variance, defect ratio ≤ 8.0%.</p>
                <div className="text-[11px] font-semibold text-blue-800 bg-blue-100/60 rounded px-2 py-0.5 inline-block">Wholesale Market Standard</div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Fair Commercial</span>
                  <span className="inline-flex size-6 items-center justify-center rounded-full bg-amber-100 text-amber-800 text-xs font-bold">C</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">Grade C (Acceptable)</h3>
                <p className="text-xs text-slate-600 mb-3">Minor skin peel or shape irregularities, defect ratio ≤ 12.0%.</p>
                <div className="text-[11px] font-semibold text-amber-800 bg-amber-100/60 rounded px-2 py-0.5 inline-block">Retail Discount Lot</div>
              </div>

              <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-red-700">Sub-standard</span>
                  <span className="inline-flex size-6 items-center justify-center rounded-full bg-red-100 text-red-800 text-xs font-bold">URS</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">URS (Under-grade)</h3>
                <p className="text-xs text-slate-600 mb-3">Severe rot, extensive sprouting, or defect ratio &gt; 12.0%.</p>
                <div className="text-[11px] font-semibold text-red-800 bg-red-100/60 rounded px-2 py-0.5 inline-block">Subject to Rejection</div>
              </div>
            </div>
          </div>
        </section>

        {/* Workflow Overview */}
        <section className="px-4 py-12 max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Enterprise Inspection Pipeline</h2>
            <p className="text-xs md:text-sm text-slate-500 mt-1">From tray camera capture to tamper-evident cryptographic QR verification</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="inline-flex size-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 mb-3">
                <Layers className="size-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">1. Multi-Tray Lot Capture</h3>
              <p className="text-xs text-slate-600">Sample large onion lots across multiple tray captures with live sharpness, lighting uniformity, and frame coverage guidance.</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="inline-flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 mb-3">
                <Zap className="size-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">2. YOLO AI Vision</h3>
              <p className="text-xs text-slate-600">High-resolution onion detection, defect classification (Healthy, Rotten/Damaged, Sprouted), and coin-referenced physical diameter estimation.</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="inline-flex size-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 mb-3">
                <Scale className="size-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">3. Dual-Track Human Review</h3>
              <p className="text-xs text-slate-600">Officers retain complete oversight. Compare AI vs Officer assessments, override specific bulbs with documented reasons, and recalibrate grades instantly.</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="inline-flex size-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600 mb-3">
                <FileCheck2 className="size-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">4. Official PDF Certificate</h3>
              <p className="text-xs text-slate-600">Generated using ReportLab vector graphics, containing complete lot metadata, dual assessment comparison, audit timeline, and embedded QR code.</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="inline-flex size-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600 mb-3">
                <QrCode className="size-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">5. Public QR Verification</h3>
              <p className="text-xs text-slate-600">Traders and mandi buyers can scan the printed QR code with any smartphone to instantly verify certificate validity on the public ledger.</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="inline-flex size-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 mb-3">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">6. User Isolation & Security</h3>
              <p className="text-xs text-slate-600">Protected by JWT token authentication, Supabase Row-Level Security (RLS), and isolated inspection workspaces per mandi officer.</p>
            </div>
          </div>
        </section>

        {/* Visual Inspection Limitations Disclaimer */}
        <section className="px-4 py-8 bg-amber-50/70 border-t border-amber-200">
          <div className="max-w-3xl mx-auto flex items-start gap-3">
            <ShieldCheck className="size-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <span className="font-bold">Official Procurement Disclaimer:</span> ONIVIS performs non-destructive optical surface inspection. Optical AI evaluates visible surface characteristics (skin integrity, surface rot, sprouting, and physical diameter). Sub-surface or internal microbial degradation not visible externally requires authorized physical core sampling according to APMC standard operating procedures.
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-4 py-6 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>© 2026 ONIVIS — National Agricultural Procurement Quality Auditor</div>
          <div className="flex items-center gap-4 text-slate-400">
            <Link to="/welcome" className="hover:text-slate-600">Home</Link>
            <Link to="/login" className="hover:text-slate-600">Inspector Portal</Link>
            <Link to="/inspection/new" className="hover:text-slate-600">Audit Workflow</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
