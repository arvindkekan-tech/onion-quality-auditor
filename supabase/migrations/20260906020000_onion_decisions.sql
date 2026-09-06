-- ONIVIS audit log for individual officer onion overrides and dual assessment fields.

create table if not exists public.onion_decisions (
    id text primary key,
    inspection_id text not null references public.inspections(id) on delete cascade,
    onion_id text not null,
    image_id text,
    ai_class text not null,
    officer_class text not null,
    final_class text not null,
    ai_size text,
    officer_size text,
    final_size text,
    reason text,
    officer_name text,
    created_at timestamptz not null
);

create index if not exists onion_decisions_inspection_id_idx
    on public.onion_decisions(inspection_id);

alter table public.reviews
    add column if not exists override_count integer default 0,
    add column if not exists officer_summary jsonb;

alter table public.certificates
    add column if not exists ai_grade text,
    add column if not exists officer_grade text,
    add column if not exists override_count integer default 0,
    add column if not exists dual_assessment jsonb;
