import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Inbox,
  Search,
  ShieldCheck,
  User,
  X,
} from 'lucide-react'

import { PrimaryButton, SecondaryButton } from '@/components/shared'
import {
  useOfficerReAuditRequests,
  useUpdateOfficerReAuditStatus,
  useCompleteOfficerReAudit,
} from '@/features/inspections/hooks'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { ReAuditRequestDetail } from '@/types/inspection'

const AVAILABLE_EVIDENCE = [
  'Original inspection image',
  'Annotated inspection image',
  'AI detection evidence',
  'Classification evidence',
  'Grading calculation',
  'Physical-size evidence',
]

const FINDING_OPTIONS = [
  'Original assessment confirmed',
  'Assessment changed',
  'Unable to determine from available evidence',
]

const GRADE_OPTIONS = ['Grade A', 'Grade B', 'Grade C', 'Rejected / URS']

function formatRequestDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    if (isToday) return 'Today'
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function getStatusBadge(status: string) {
  const norm = status.toUpperCase()
  if (norm === 'COMPLETED' || norm === 'ACCEPTED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="size-3" />
        Completed
      </span>
    )
  }
  if (norm === 'IN_REVIEW' || norm === 'IN REVIEW') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-bold text-blue-600 dark:text-blue-400">
        <Clock className="size-3" />
        In Review
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
      <Clock className="size-3" />
      Pending
    </span>
  )
}

export function ReAuditRequestsPage() {
  const navigate = useNavigate()
  const requestsQuery = useOfficerReAuditRequests()
  const updateStatusMutation = useUpdateOfficerReAuditStatus()
  const completeReAuditMutation = useCompleteOfficerReAudit()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_review' | 'completed'>('all')
  const [selectedRequest, setSelectedRequest] = useState<ReAuditRequestDetail | null>(null)
  const [officerNotes, setOfficerNotes] = useState('')

  // Officer re-audit form state
  const [reAuditFinding, setReAuditFinding] = useState<string>(FINDING_OPTIONS[0])
  const [reAuditGrade, setReAuditGrade] = useState<string>(GRADE_OPTIONS[0])
  const [reAuditExplanation, setReAuditExplanation] = useState<string>('')
  const [evidenceReviewed, setEvidenceReviewed] = useState<string[]>([
    'Original inspection image',
    'Annotated inspection image',
    'AI detection evidence',
    'Grading calculation',
  ])
  const [completeError, setCompleteError] = useState<string | null>(null)

  const allRequests = requestsQuery.data ?? []

  const pendingCount = allRequests.filter(
    (r) => r.status?.toUpperCase() === 'PENDING',
  ).length
  const inReviewCount = allRequests.filter(
    (r) => r.status?.toUpperCase() === 'IN_REVIEW',
  ).length
  const completedCount = allRequests.filter((r) => {
    const s = r.status?.toUpperCase()
    return s === 'COMPLETED' || s === 'ACCEPTED'
  }).length

  const filteredRequests = allRequests.filter((item) => {
    // Status filtering
    const s = item.status?.toUpperCase()
    if (statusFilter === 'pending' && s !== 'PENDING') return false
    if (statusFilter === 'in_review' && s !== 'IN_REVIEW') return false
    if (statusFilter === 'completed' && s !== 'COMPLETED' && s !== 'ACCEPTED') return false

    // Search filtering
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      item.id.toLowerCase().includes(term) ||
      (item.certificateId && item.certificateId.toLowerCase().includes(term)) ||
      item.farmerName.toLowerCase().includes(term) ||
      item.reasonCategory.toLowerCase().includes(term) ||
      (item.comments && item.comments.toLowerCase().includes(term))
    )
  })

  function handleOpenRequest(req: ReAuditRequestDetail) {
    setSelectedRequest(req)
    setOfficerNotes('')
    setCompleteError(null)
    setReAuditFinding(req.finding || FINDING_OPTIONS[0])
    setReAuditGrade(req.reAuditGrade || req.originalGrade || GRADE_OPTIONS[0])
    setReAuditExplanation(req.explanation || '')
    setEvidenceReviewed(
      req.evidenceReviewed && req.evidenceReviewed.length > 0
        ? req.evidenceReviewed
        : [
            'Original inspection image',
            'Annotated inspection image',
            'AI detection evidence',
            'Grading calculation',
          ],
    )
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (!selectedRequest) return
    try {
      const updated = await updateStatusMutation.mutateAsync({
        requestId: selectedRequest.id,
        status: newStatus,
        notes: officerNotes.trim() || undefined,
      })
      handleOpenRequest(updated)
    } catch {
      // Error handled by react-query
    }
  }

  const handleCompleteReAudit = async () => {
    if (!selectedRequest) return
    if (!reAuditExplanation.trim()) {
      setCompleteError('Officer explanation is required before completing the re-audit.')
      return
    }
    if (evidenceReviewed.length === 0) {
      setCompleteError('At least one evidence item must be selected as reviewed.')
      return
    }

    setCompleteError(null)
    try {
      const updated = await completeReAuditMutation.mutateAsync({
        requestId: selectedRequest.id,
        input: {
          finding: reAuditFinding,
          explanation: reAuditExplanation.trim(),
          evidenceReviewed,
          reAuditGrade: reAuditFinding === 'Assessment changed' ? reAuditGrade : undefined,
        },
      })
      handleOpenRequest(updated)
    } catch (err: unknown) {
      setCompleteError(err instanceof Error ? err.message : 'Failed to complete re-audit.')
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-4 pt-5 max-w-xl mx-auto w-full">
      {/* Top Header with Back Button */}
      <div className="flex items-center gap-3">
        <Link
          to={ROUTES.dashboard}
          className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-colors shadow-2xs"
          aria-label="Back to Dashboard"
        >
          <ArrowLeft className="size-4.5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            Re-audit Requests
          </h1>
          <p className="text-xs text-muted-foreground truncate">
            Requests authorized for your certified inspections
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by Certificate, Farmer, or Reason…"
          className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-9 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-soft"
        />
        {searchTerm ? (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { key: 'all', label: `All (${allRequests.length})` },
          { key: 'pending', label: `Pending (${pendingCount})` },
          { key: 'in_review', label: `In Review (${inReviewCount})` },
          { key: 'completed', label: `Completed (${completedCount})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStatusFilter(tab.key as typeof statusFilter)}
            className={cn(
              'shrink-0 rounded-lg px-3 py-1.5 font-medium transition-colors cursor-pointer',
              statusFilter === tab.key
                ? 'bg-primary text-primary-foreground shadow-2xs font-semibold'
                : 'border border-border bg-surface-muted text-muted-foreground hover:bg-muted',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Request Count Header */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing {filteredRequests.length} of {allRequests.length} request{allRequests.length === 1 ? '' : 's'}
        </span>
        {pendingCount > 0 ? (
          <span className="font-semibold text-amber-600 dark:text-amber-400">
            {pendingCount} Pending Action
          </span>
        ) : null}
      </div>

      {/* Request Cards List */}
      {requestsQuery.isPending ? (
        <p className="text-xs text-muted-foreground py-8 text-center">
          Loading re-audit requests…
        </p>
      ) : requestsQuery.isError ? (
        <p className="text-xs text-destructive py-8 text-center" role="alert">
          Unable to load re-audit requests. Please check your connection.
        </p>
      ) : allRequests.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-surface-muted/50 p-8 text-center">
          <Inbox className="size-10 text-muted-foreground/60 mb-2" />
          <p className="text-sm font-semibold text-foreground">
            No pending re-audit requests
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
            When farmers or mandis submit an independent re-audit request for your certified lots, it will appear here.
          </p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface-muted p-6 text-center text-xs text-muted-foreground">
          No re-audit requests matching &quot;{searchTerm}&quot;.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => (
            <div
              key={req.id}
              data-testid="request-card"
              onClick={() => handleOpenRequest(req)}
              className="rounded-xl border border-border bg-card p-4 shadow-2xs hover:border-primary/40 hover:bg-muted/30 transition-all cursor-pointer space-y-3 group"
            >
              {/* Card Header: Status + Date */}
              <div className="flex items-center justify-between">
                {getStatusBadge(req.status)}
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Calendar className="size-3" />
                  {formatRequestDate(req.createdAt)}
                </span>
              </div>

              {/* Certificate & Farmer Details */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-foreground">
                    {req.certificateId || req.inspectionId}
                  </span>
                  {req.originalGrade ? (
                    <span className="rounded-md bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                      Grade: {req.originalGrade}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                  <User className="size-3.5 text-muted-foreground" />
                  <span>{req.farmerName}</span>
                  {req.phoneNumber ? (
                    <span className="text-muted-foreground text-[11px]">
                      • {req.phoneNumber}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Dispute Reason & Comments */}
              <div className="rounded-lg bg-surface-muted p-2.5 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Reason
                  </span>
                  <span className="font-semibold text-foreground">
                    {req.reasonCategory}
                  </span>
                </div>
                {req.comments ? (
                  <p className="text-[11px] text-muted-foreground line-clamp-2 italic">
                    &ldquo;{req.comments}&rdquo;
                  </p>
                ) : null}
              </div>

              {/* Card Action Row */}
              <div className="flex items-center justify-between pt-1 border-t border-border/60">
                <span className="text-[11px] text-muted-foreground font-mono">
                  {req.id}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleOpenRequest(req)
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform cursor-pointer"
                >
                  <span>View Details</span>
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Progressive Disclosure: Request Detail Modal */}
      {selectedRequest ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Officer Review
                </span>
                <h3 className="font-bold text-foreground text-sm">
                  Independent Quality Re-audit Request
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="rounded-full p-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground cursor-pointer"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Status Banner */}
            <div className="flex items-center justify-between rounded-xl bg-surface-muted p-3 border border-border">
              <span className="text-xs font-semibold text-foreground">
                Current Status
              </span>
              {getStatusBadge(selectedRequest.status)}
            </div>

            {/* Request & Certificate Identifiers */}
            <div className="rounded-xl border border-border bg-card p-3 space-y-2 text-xs">
              <div className="flex justify-between border-b border-border/50 pb-1.5">
                <span className="text-muted-foreground">Request ID</span>
                <span className="font-mono font-bold text-foreground">
                  {selectedRequest.id}
                </span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-1.5 items-center">
                <span className="text-muted-foreground">Certificate ID</span>
                {selectedRequest.certificateId ? (
                  <Link
                    to={`/certificate/${selectedRequest.certificateId}`}
                    className="inline-flex items-center gap-1 font-mono font-bold text-primary hover:underline"
                  >
                    <span>{selectedRequest.certificateId}</span>
                    <ExternalLink className="size-3" />
                  </Link>
                ) : (
                  <span className="font-mono text-muted-foreground">N/A</span>
                )}
              </div>
              <div className="flex justify-between border-b border-border/50 pb-1.5">
                <span className="text-muted-foreground">Inspection ID</span>
                <span className="font-mono text-foreground">
                  {selectedRequest.inspectionId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Request Date</span>
                <span className="font-medium text-foreground">
                  {new Date(selectedRequest.createdAt).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
            </div>

            {/* Farmer's Requested Review */}
            <div className="rounded-xl border border-border bg-card p-3 space-y-2 text-xs">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Farmer&apos;s Requested Review
              </h4>
              <div className="flex justify-between border-b border-border/50 pb-1.5">
                <span className="text-muted-foreground">Farmer Name</span>
                <span className="font-bold text-foreground">
                  {selectedRequest.farmerName}
                </span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-1.5">
                <span className="text-muted-foreground">Phone Number</span>
                <span className="font-medium text-foreground">
                  {selectedRequest.phoneNumber || 'Not provided'}
                </span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-1.5">
                <span className="text-muted-foreground">Dispute Reason</span>
                <span className="font-bold text-foreground">
                  {selectedRequest.reasonCategory}
                </span>
              </div>
              <div className="pt-1">
                <span className="text-[10px] text-muted-foreground font-semibold">
                  Observations / Remarks:
                </span>
                <p className="mt-0.5 text-xs text-foreground bg-surface-muted p-2.5 rounded-lg italic border border-border/40">
                  {selectedRequest.comments
                    ? `“${selectedRequest.comments}”`
                    : 'No specific observations or remarks submitted.'}
                </p>
              </div>
            </div>

            {/* Original Inspection Evidence Summary */}
            <div className="rounded-xl border border-border bg-card p-3 space-y-2 text-xs">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Original Inspection Evidence
              </h4>
              <div className="flex justify-between border-b border-border/50 pb-1.5">
                <span className="text-muted-foreground">Original Grade</span>
                <span className="font-bold text-foreground">
                  {selectedRequest.originalGrade || 'Pending'}
                </span>
              </div>
              {selectedRequest.inspectionDate ? (
                <div className="flex justify-between border-b border-border/50 pb-1.5">
                  <span className="text-muted-foreground">Inspection Date</span>
                  <span className="font-medium text-foreground">
                    {new Date(selectedRequest.inspectionDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              ) : null}
              {selectedRequest.sampleSize ? (
                <div className="flex justify-between border-b border-border/50 pb-1.5">
                  <span className="text-muted-foreground">Sample Size</span>
                  <span className="font-medium text-foreground">
                    {selectedRequest.sampleSize} bulbs
                  </span>
                </div>
              ) : null}
              {selectedRequest.variety || selectedRequest.location ? (
                <div className="flex justify-between border-b border-border/50 pb-1.5">
                  <span className="text-muted-foreground">Lot / Centre</span>
                  <span className="font-medium text-foreground truncate max-w-[200px]">
                    {[selectedRequest.variety, selectedRequest.location]
                      .filter(Boolean)
                      .join(' • ')}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Authorized Officer</span>
                <span className="font-medium text-foreground">
                  {selectedRequest.inspectorName || 'Authorized Officer'}
                </span>
              </div>
              {selectedRequest.defectSummary ? (
                <div className="pt-1">
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    Defect Summary:
                  </span>
                  <p className="mt-0.5 text-xs text-foreground bg-surface-muted p-2 rounded-lg">
                    {selectedRequest.defectSummary}
                  </p>
                </div>
              ) : null}
            </div>

            {/* Documented Re-audit Determination (Visible when Completed) */}
            {selectedRequest.status?.toUpperCase() === 'COMPLETED' ||
            selectedRequest.status?.toUpperCase() === 'ACCEPTED' ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/15 p-3.5 space-y-2.5 text-xs">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  Documented Re-audit Determination
                </h4>
                <div className="flex justify-between border-b border-border/50 pb-1.5">
                  <span className="text-muted-foreground">Finding:</span>
                  <span className="font-bold text-foreground">
                    {selectedRequest.finding || 'Original assessment confirmed'}
                  </span>
                </div>
                {selectedRequest.reAuditGrade &&
                selectedRequest.reAuditGrade !== selectedRequest.originalGrade ? (
                  <div className="flex justify-between border-b border-border/50 pb-1.5">
                    <span className="text-muted-foreground">Re-audit Grade:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {selectedRequest.reAuditGrade}
                    </span>
                  </div>
                ) : null}
                {selectedRequest.evidenceReviewed &&
                selectedRequest.evidenceReviewed.length > 0 ? (
                  <div className="border-b border-border/50 pb-1.5">
                    <span className="text-muted-foreground block mb-1">Evidence Reviewed:</span>
                    <ul className="space-y-1">
                      {selectedRequest.evidenceReviewed.map((ev, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-foreground font-medium">
                          <CheckCircle2 className="size-3 text-emerald-600 shrink-0" />
                          <span>{ev}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div>
                  <span className="text-muted-foreground block mb-1">Officer Explanation:</span>
                  <p className="bg-card p-2.5 rounded-lg text-foreground border border-border/50 whitespace-pre-wrap leading-relaxed">
                    {selectedRequest.explanation || 'Reviewed and confirmed.'}
                  </p>
                </div>
                {selectedRequest.completedBy ? (
                  <div className="flex justify-between text-[11px] text-muted-foreground pt-1">
                    <span>Officer: {selectedRequest.completedBy}</span>
                    {selectedRequest.completedAt ? (
                      <span>
                        {new Date(selectedRequest.completedAt).toLocaleString('en-IN', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Officer Re-audit Documentation Form (Visible when IN_REVIEW) */}
            {selectedRequest.status?.toUpperCase() === 'IN_REVIEW' ? (
              <div className="rounded-xl border border-blue-500/30 bg-card p-3.5 space-y-3 text-xs shadow-2xs">
                <div className="border-b border-border/60 pb-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                    Document Re-audit & Determination
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Review available inspection evidence and record your official finding and explanation.
                  </p>
                </div>

                {/* Evidence Reviewed */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Evidence Reviewed *
                  </label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {AVAILABLE_EVIDENCE.map((ev) => {
                      const isChecked = evidenceReviewed.includes(ev)
                      return (
                        <label
                          key={ev}
                          className={cn(
                            'flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition-colors text-xs',
                            isChecked
                              ? 'border-primary/50 bg-primary/5 text-foreground font-medium'
                              : 'border-border bg-surface-muted text-muted-foreground hover:bg-muted/50',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEvidenceReviewed([...evidenceReviewed, ev])
                              } else {
                                setEvidenceReviewed(evidenceReviewed.filter((x) => x !== ev))
                              }
                            }}
                            className="size-3.5 rounded border-border text-primary focus:ring-primary"
                          />
                          <span>{ev}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                {/* Re-audit Finding */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Re-audit Finding *
                  </label>
                  <select
                    value={reAuditFinding}
                    onChange={(e) => setReAuditFinding(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface-muted p-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    {FINDING_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Re-audit Grade if changed */}
                {reAuditFinding === 'Assessment changed' ? (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      New Re-audit Assessment Grade *
                    </label>
                    <select
                      value={reAuditGrade}
                      onChange={(e) => setReAuditGrade(e.target.value)}
                      className="w-full rounded-lg border border-border bg-surface-muted p-2 text-xs text-foreground focus:border-primary focus:outline-none"
                    >
                      {GRADE_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {/* Officer Explanation */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Re-audit Explanation *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={reAuditExplanation}
                    onChange={(e) => setReAuditExplanation(e.target.value)}
                    placeholder="Explain what was reviewed and why the original assessment was confirmed or changed."
                    className="w-full rounded-lg border border-border bg-surface-muted p-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Required. Explain the evidence analyzed and basis for confirmation or change.
                  </p>
                </div>

                {completeError ? (
                  <p className="text-xs text-destructive">{completeError}</p>
                ) : null}

                <PrimaryButton
                  fullWidth
                  onClick={handleCompleteReAudit}
                  disabled={
                    completeReAuditMutation.isPending ||
                    !reAuditExplanation.trim() ||
                    evidenceReviewed.length === 0
                  }
                  className="text-xs h-9"
                >
                  {completeReAuditMutation.isPending
                    ? 'Completing Re-audit…'
                    : 'Complete Re-audit'}
                </PrimaryButton>
              </div>
            ) : null}

            {/* Officer Workflow Actions */}
            <div className="space-y-2 pt-2 border-t border-border">
              {/* Primary action to start re-audit if PENDING */}
              {selectedRequest.status?.toUpperCase() === 'PENDING' ? (
                <PrimaryButton
                  fullWidth
                  onClick={() => handleStatusUpdate('IN_REVIEW')}
                  disabled={updateStatusMutation.isPending}
                  className="text-xs h-9"
                >
                  {updateStatusMutation.isPending ? 'Starting…' : 'Start Re-audit'}
                </PrimaryButton>
              ) : null}

              {/* View original inspection results */}
              <SecondaryButton
                fullWidth
                onClick={() =>
                  navigate(`/inspection/${selectedRequest.inspectionId}/results`)
                }
                className="text-xs h-9 gap-1.5"
              >
                <ShieldCheck className="size-3.5" />
                View Original Inspection
              </SecondaryButton>

              <SecondaryButton
                fullWidth
                onClick={() => setSelectedRequest(null)}
                className="text-xs h-8.5"
              >
                Close
              </SecondaryButton>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
