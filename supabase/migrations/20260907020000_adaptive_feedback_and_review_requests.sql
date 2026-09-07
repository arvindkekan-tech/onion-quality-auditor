-- Migration: 20260907020000_adaptive_feedback_and_review_requests.sql
-- Description: Add verified_feedback, review_requests, and analysis explainability/attention columns

-- 1. Verified Feedback Table (Adaptive Review Intelligence)
CREATE TABLE IF NOT EXISTS public.verified_feedback (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    inspection_id TEXT NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
    onion_id TEXT NOT NULL,
    ai_class TEXT NOT NULL,
    ai_confidence REAL,
    ai_size TEXT,
    officer_class TEXT NOT NULL,
    officer_size TEXT,
    reason TEXT,
    procurement_centre TEXT,
    variety TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Review Requests Table (Farmer Transparency Appeals)
CREATE TABLE IF NOT EXISTS public.review_requests (
    id TEXT PRIMARY KEY,
    inspection_id TEXT NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
    farmer_name TEXT NOT NULL,
    phone_number TEXT,
    reason_category TEXT NOT NULL,
    comments TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Add Explainability and Attention Queue columns to analysis_results
DO 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'analysis_results' AND column_name = 'attention_queue') THEN
        ALTER TABLE public.analysis_results ADD COLUMN attention_queue JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'analysis_results' AND column_name = 'why_this_grade') THEN
        ALTER TABLE public.analysis_results ADD COLUMN why_this_grade JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'analysis_results' AND column_name = 'standards_matrix') THEN
        ALTER TABLE public.analysis_results ADD COLUMN standards_matrix JSONB;
    END IF;
END ;

-- 4. Enable Row Level Security
ALTER TABLE public.verified_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;

-- 5. Policies
DROP POLICY IF EXISTS verified_feedback_policy ON public.verified_feedback;
CREATE POLICY verified_feedback_policy ON public.verified_feedback
    FOR ALL
    USING (true);

DROP POLICY IF EXISTS review_requests_policy ON public.review_requests;
CREATE POLICY review_requests_policy ON public.review_requests
    FOR ALL
    USING (true);
