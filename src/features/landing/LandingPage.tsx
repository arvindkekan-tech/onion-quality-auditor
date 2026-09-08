import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Camera,
  FileCheck2,
  FileSearch,
  Layers,
  QrCode,
  Scale,
  ShieldCheck,
  Sparkles,
  Upload,
} from 'lucide-react'

import { PrimaryButton } from '@/components/shared/PrimaryButton'
import { SecondaryButton } from '@/components/shared/SecondaryButton'
import { useAuthStore } from '@/stores/authStore'

export function LandingPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 flex flex-col antialiased">
      {/* 1. Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/onivis-icon.png"
              alt="ONIVIS"
              className="size-9 object-contain shrink-0"
            />
            <div>
              <div className="text-sm font-bold tracking-tight text-slate-900 leading-none">ONIVIS</div>
              <div className="text-[10px] text-emerald-800 font-medium tracking-wide mt-0.5">
                Inspect. Evidence. Certify. Verify.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Link to="/">
                <PrimaryButton className="h-8.5 px-3.5 text-xs bg-emerald-700 hover:bg-emerald-800">
                  Dashboard →
                </PrimaryButton>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <SecondaryButton className="h-8.5 px-3 text-xs">Sign In</SecondaryButton>
                </Link>
                <Link to="/signup">
                  <PrimaryButton className="h-8.5 px-3 text-xs bg-emerald-700 hover:bg-emerald-800">
                    Register
                  </PrimaryButton>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* 2. Hero Section */}
        <section className="px-4 pt-10 pb-12 md:py-16 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 mb-5 shadow-2xs">
            <Sparkles className="size-3.5 text-emerald-700" />
            AI-assisted Onion Quality Inspection
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
            Smarter Onion Quality Inspection, Built for the Field.
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto mb-8 leading-relaxed">
            Capture onion samples, review AI-assisted visual evidence, document inspection decisions, and issue digitally verifiable quality records — all from one workflow.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <div className="w-full sm:w-auto flex-1 flex flex-col items-center">
              <Link to="/inspection/new" className="w-full">
                <PrimaryButton fullWidth className="h-12 text-sm font-semibold bg-emerald-700 hover:bg-emerald-800 shadow-sm">
                  Try ONIVIS
                  <ArrowRight className="ml-2 size-4" />
                </PrimaryButton>
              </Link>
              <span className="text-[11px] text-slate-500 mt-1">Explore the inspection workflow.</span>
            </div>

            <div className="w-full sm:w-auto flex-1 flex flex-col items-center">
              <Link to="/verify" className="w-full">
                <SecondaryButton fullWidth className="h-12 text-sm font-semibold border-slate-300">
                  <QrCode className="mr-2 size-4 text-slate-700" />
                  Verify Certificate
                </SecondaryButton>
              </Link>
              <span className="text-[11px] text-transparent mt-1 select-none">Spacer</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 mt-3">
            Public verification does not require an account.
          </p>
        </section>

        {/* 3. Visual Inspection Preview (Photo → Detection → Review → Certificate) */}
        <section className="px-4 py-8 bg-slate-100/70 border-y border-slate-200/80">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Field Inspection Sequence
              </h2>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">
                From tray sample to verifiable digital documentation
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs text-center flex flex-col items-center">
                <div className="size-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center mb-2 font-bold text-xs">
                  <Camera className="size-4.5" />
                </div>
                <span className="text-[11px] font-bold text-slate-500 uppercase">Step 1</span>
                <span className="text-xs font-semibold text-slate-900 mt-0.5">Photo</span>
                <span className="text-[11px] text-slate-500 mt-1">Capture standard tray sample</span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs text-center flex flex-col items-center">
                <div className="size-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2 font-bold text-xs">
                  <Layers className="size-4.5" />
                </div>
                <span className="text-[11px] font-bold text-emerald-600 uppercase">Step 2</span>
                <span className="text-xs font-semibold text-slate-900 mt-0.5">Detection</span>
                <span className="text-[11px] text-slate-500 mt-1">Optical defect & size analysis</span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs text-center flex flex-col items-center">
                <div className="size-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-2 font-bold text-xs">
                  <Scale className="size-4.5" />
                </div>
                <span className="text-[11px] font-bold text-blue-600 uppercase">Step 3</span>
                <span className="text-xs font-semibold text-slate-900 mt-0.5">Review</span>
                <span className="text-[11px] text-slate-500 mt-1">Officer decision & remarks</span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs text-center flex flex-col items-center">
                <div className="size-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center mb-2 font-bold text-xs">
                  <FileCheck2 className="size-4.5" />
                </div>
                <span className="text-[11px] font-bold text-purple-600 uppercase">Step 4</span>
                <span className="text-xs font-semibold text-slate-900 mt-0.5">Certificate</span>
                <span className="text-[11px] text-slate-500 mt-1">Tamper-evident record & QR</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. How ONIVIS Works (5-step visual flow) */}
        <section className="px-4 py-12 max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              How ONIVIS Works
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              A structured 5-step workflow designed for field clarity
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="text-xs font-bold text-emerald-800 mb-1">1. Capture</div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Image Ingestion</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Capture or upload the onion sample tray from mobile camera or storage.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="text-xs font-bold text-emerald-800 mb-1">2. Check</div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Pre-Analysis Quality</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Evaluate lighting, contrast, resolution, and sharpness for suitability.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="text-xs font-bold text-emerald-800 mb-1">3. Analyze</div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">AI-Assisted Vision</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Visual detection, defect classification, and physical size estimation.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="text-xs font-bold text-emerald-800 mb-1">4. Review</div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Officer Decision</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Officer reviews findings, audits observations, and decides approval or rejection.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:col-span-2 md:col-span-1">
              <div className="text-xs font-bold text-emerald-800 mb-1">5. Certify</div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Verifiable Record</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Generate a structured digital quality record with a verifiable QR code.
              </p>
            </div>
          </div>
        </section>

        {/* 5. What ONIVIS Helps With (4 compact cards) */}
        <section className="px-4 py-10 bg-slate-50 border-t border-slate-200/80">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                What ONIVIS Helps With
              </h2>
              <p className="text-xs md:text-sm text-slate-500 mt-1">
                Practical benefits for procurement centres, mandi yards, and field auditors
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-2xs flex items-start gap-3">
                <div className="size-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">AI-Assisted Inspection</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Visual detection and classification from captured sample images, highlighting potential defects and size distributions.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-2xs flex items-start gap-3">
                <div className="size-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Layers className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Evidence-Based Results</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Keep quantitative inspection evidence together with the result, including defect ratios, calibration, and audit logs.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-2xs flex items-start gap-3">
                <div className="size-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                  <FileCheck2 className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Digital Certification</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Generate a structured digital quality record documenting officer approval, notes, and dual-track assessment.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-2xs flex items-start gap-3">
                <div className="size-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                  <QrCode className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Public Verification</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Verify a certificate using QR code, report upload, or verification ID directly without logging in.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Transparency Section */}
        <section className="px-4 py-6 bg-emerald-900 text-white">
          <div className="max-w-3xl mx-auto flex items-center gap-3 text-center sm:text-left flex-col sm:flex-row py-2">
            <div className="size-10 rounded-full bg-emerald-800 flex items-center justify-center shrink-0">
              <ShieldCheck className="size-5 text-emerald-300" />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Inspection Transparency & Accountability
              </h3>
              <p className="text-xs text-emerald-100 mt-0.5 leading-relaxed font-medium">
                AI assists the inspection. The officer remains responsible for the final decision.
              </p>
            </div>
          </div>
        </section>

        {/* 7. Public Verification CTA */}
        <section className="px-4 py-12 max-w-3xl mx-auto">
          <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 sm:p-8 shadow-sm text-center">
            <div className="inline-flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-800 mb-3">
              <QrCode className="size-6 text-emerald-700" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Already have an ONIVIS certificate?
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1.5 max-w-md mx-auto">
              Check the authenticity, audit timeline, and quality record of any issued certificate.
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2.5 max-w-lg mx-auto">
              <Link to="/verify?mode=scan">
                <SecondaryButton className="h-10 text-xs font-medium border-slate-300">
                  <Camera className="mr-1.5 size-3.5 text-emerald-700" />
                  Scan QR
                </SecondaryButton>
              </Link>

              <Link to="/verify?mode=upload">
                <SecondaryButton className="h-10 text-xs font-medium border-slate-300">
                  <Upload className="mr-1.5 size-3.5 text-blue-600" />
                  Upload Report
                </SecondaryButton>
              </Link>

              <Link to="/verify?mode=id">
                <SecondaryButton className="h-10 text-xs font-medium border-slate-300">
                  <FileSearch className="mr-1.5 size-3.5 text-purple-600" />
                  Enter Verification ID
                </SecondaryButton>
              </Link>
            </div>

            <p className="text-[11px] font-semibold text-emerald-700 mt-4">
              No account required.
            </p>
          </div>
        </section>
      </main>

      {/* 8. Footer */}
      <footer className="border-t border-slate-200 bg-white px-4 py-8 text-xs text-slate-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <div className="font-bold text-slate-900">ONIVIS</div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              AI-assisted Onion Quality Inspection
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-600">
            <Link to="/verify" className="hover:text-emerald-700 transition-colors">Verify Certificate</Link>
            <Link to="/login" className="hover:text-emerald-700 transition-colors">Sign In</Link>
            <Link to="/signup" className="hover:text-emerald-700 transition-colors">Register</Link>
            <Link to="/inspection/new" className="hover:text-emerald-700 transition-colors">New Inspection</Link>
          </div>
        </div>

        <div className="max-w-4xl mx-auto mt-6 pt-4 border-t border-slate-100 text-center text-[10px] text-slate-400">
          Non-destructive optical surface inspection tool. Physical core sampling remains under standard operating procedures.
        </div>
      </footer>
    </div>
  )
}
