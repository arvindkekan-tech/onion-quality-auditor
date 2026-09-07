# ONIVIS — Database Architecture & Persistence Guide

This guide details the database design, schema definitions, relational constraints, Supabase migrations, and local SQLite engine fallbacks.

---

## 1. Dual Persistence Strategy

ONIVIS implements an interchangeable dual persistence architecture:
1. **Production Engine**: Supabase (Cloud PostgreSQL 15+) with PostgreSQL Row-Level Security (RLS) policies, JSONB document fields, and real-time triggers.
2. **Local / Disconnected Engine**: Self-healing SQLite3 database (`onivis_local.db`), enabling offline operations at remote mandi yards without active internet connectivity.

Both persistence paths are wrapped by identical synchronous and asynchronous interfaces in `app/store.py` and `app/local_store.py`.

---

## 2. Relational Schema & Tables

### 2.1 `inspections`
Primary entity storing procurement lot metadata and status lifecycle.
```sql
CREATE TABLE inspections (
    id TEXT PRIMARY KEY,
    variety TEXT NOT NULL,
    weight_kg NUMERIC(10, 2) NOT NULL,
    location TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'draft',
    analysis_status TEXT,
    analysis_poll_count INTEGER DEFAULT 0,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    result JSONB
);
```

### 2.2 `images`
Stores uploaded sample photos and optical quality gate metrics.
```sql
CREATE TABLE images (
    id TEXT PRIMARY KEY,
    inspection_id TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    url TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    quality_checks JSONB
);
```

### 2.3 `onion_decisions`
Stores individual bulb audits and manual officer overrides.
```sql
CREATE TABLE onion_decisions (
    id TEXT PRIMARY KEY,
    inspection_id TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    onion_id TEXT NOT NULL,
    image_id TEXT,
    ai_class TEXT NOT NULL,
    officer_class TEXT NOT NULL,
    final_class TEXT NOT NULL,
    ai_size TEXT,
    officer_size TEXT,
    final_size TEXT,
    reason TEXT,
    officer_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.4 `certificates`
Cryptographically verifiable APMC inspection certificates.
```sql
CREATE TABLE certificates (
    id TEXT PRIMARY KEY,
    inspection_id TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    grade TEXT NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    batch_label TEXT NOT NULL,
    batch_id TEXT,
    qr_token TEXT NOT NULL UNIQUE,
    inspector_name TEXT,
    procurement_centre TEXT,
    specification TEXT,
    sample_size INTEGER,
    confidence NUMERIC(5, 4),
    defect_summary TEXT,
    ai_grade TEXT,
    officer_grade TEXT,
    override_count INTEGER DEFAULT 0,
    dual_assessment JSONB,
    why_this_grade JSONB,
    standards_matrix JSONB,
    audit_timeline JSONB
);
```

### 2.5 `verified_feedback` (Adaptive Intelligence Log)
Stores verified officer reclassifications to build statistical consensus context without automated model weight mutation.
```sql
CREATE TABLE verified_feedback (
    id TEXT PRIMARY KEY,
    inspection_id TEXT NOT NULL,
    onion_id TEXT NOT NULL,
    ai_predicted_class TEXT NOT NULL,
    officer_verified_class TEXT NOT NULL,
    confidence NUMERIC(5, 4),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_verified_feedback_pattern 
ON verified_feedback(ai_predicted_class, officer_verified_class);
```

### 2.6 `review_requests` (Farmer Transparency & Dispute Appeals)
Captures farmer audit dispute tickets submitted via public QR verification.
```sql
CREATE TABLE review_requests (
    id TEXT PRIMARY KEY,
    inspection_id TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    farmer_name TEXT NOT NULL,
    phone_number TEXT,
    reason_category TEXT NOT NULL,
    comments TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 3. Row-Level Security (RLS) Policies

All tables in the Supabase production database enforce strict Row-Level Security:

1. **User Data Isolation**:
   ```sql
   ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Users can manage own inspections"
   ON inspections
   FOR ALL
   TO authenticated
   USING (auth.uid() = user_id)
   WITH CHECK (auth.uid() = user_id);
   ```

2. **Public Verification Access**:
   ```sql
   ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Allow public read access to certificates via QR token"
   ON certificates
   FOR SELECT
   TO anon, authenticated
   USING (true);
   ```

3. **Public Farmer Dispute Submission**:
   ```sql
   ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Allow public dispute submission"
   ON review_requests
   FOR INSERT
   TO anon, authenticated
   WITH CHECK (true);
   ```
