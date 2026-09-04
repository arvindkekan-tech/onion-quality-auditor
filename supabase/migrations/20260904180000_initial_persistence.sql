-- ONIVIS persistent inspection schema.

create table if not exists public.inspections (
    id text primary key,
    variety text not null,
    weight_kg numeric not null check (weight_kg > 0),
    location text not null,
    created_at timestamptz not null,
    status text not null,
    analysis_status text,
    analysis_poll_count integer not null default 0
);

-- Captured image metadata; image bytes live in Supabase Storage.
create table if not exists public.inspection_images (
    id text primary key,
    inspection_id text not null references public.inspections(id) on delete cascade,
    uploaded_at timestamptz not null,
    filename text not null,
    content_type text not null,
    storage_path text not null unique,
    url text
);

create index if not exists inspection_images_inspection_id_idx
    on public.inspection_images(inspection_id);

-- Deterministic analysis output for each inspection.
create table if not exists public.analysis_results (
    inspection_id text primary key references public.inspections(id) on delete cascade,
    grade text not null,
    confidence numeric not null,
    classification text,
    total_onions integer,
    model_name text,
    defects jsonb not null,
    summary text not null,
    analyzed_at timestamptz not null
);

-- Human review associated with an inspection.
create table if not exists public.reviews (
    inspection_id text primary key references public.inspections(id) on delete cascade,
    certificate_id text,
    approved boolean not null,
    notes text,
    override_grade text,
    reviewed_at timestamptz not null
);

-- Issued certificates and their verification tokens.
create table if not exists public.certificates (
    id text primary key,
    inspection_id text not null references public.inspections(id) on delete cascade,
    grade text not null,
    issued_at timestamptz not null,
    batch_label text not null,
    qr_token text not null unique,
    inspector_name text,
    batch_id text,
    procurement_centre text,
    specification text,
    sample_size integer,
    confidence numeric,
    defect_summary text,
    audit_timeline jsonb
);

create index if not exists certificates_inspection_id_idx
    on public.certificates(inspection_id);