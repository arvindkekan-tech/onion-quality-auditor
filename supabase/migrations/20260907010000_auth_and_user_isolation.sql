-- Migration: 20260907010000_auth_and_user_isolation.sql
-- Description: Create users, password reset tokens, add user_id column, and configure RLS

-- 1. Users table
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'INSPECTOR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Password reset tokens table
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    token TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Add user_id to inspections table if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'inspections'
          AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.inspections ADD COLUMN user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_inspections_user_id ON public.inspections(user_id);
    END IF;
END $$;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- 5. Policies
-- Inspections: users can see and modify their own inspections; allow public reads for verified QR checks if needed
DROP POLICY IF EXISTS inspections_user_policy ON public.inspections;
CREATE POLICY inspections_user_policy ON public.inspections
    FOR ALL
    USING (user_id = auth.uid()::text OR user_id IS NULL);

-- Certificates: readable by everyone with the token or belonging to inspection
DROP POLICY IF EXISTS certificates_public_read ON public.certificates;
CREATE POLICY certificates_public_read ON public.certificates
    FOR SELECT
    USING (true);
