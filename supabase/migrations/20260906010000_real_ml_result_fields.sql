-- Additive fields for persisted RealMLProvider output.

alter table public.analysis_results
    add column if not exists healthy_count integer,
    add column if not exists rotten_damaged_count integer,
    add column if not exists sprouted_count integer,
    add column if not exists uncertain_count integer,
    add column if not exists annotated_image_url text,
    add column if not exists annotated_image_path text,
    add column if not exists size_estimation jsonb,
    add column if not exists detections jsonb;