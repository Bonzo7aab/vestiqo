-- OPD-53: Konkurs ofert — extended tender fields and nullable evaluation_deadline

ALTER TABLE public.tenders
  ADD COLUMN IF NOT EXISTS building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES public.job_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completion_date DATE,
  ADD COLUMN IF NOT EXISTS site_visit_type TEXT DEFAULT 'not_required'
    CHECK (site_visit_type IN ('not_required', 'optional', 'mandatory')),
  ADD COLUMN IF NOT EXISTS site_visit_notes TEXT,
  ADD COLUMN IF NOT EXISTS formal_requirements JSONB,
  ADD COLUMN IF NOT EXISTS selection_criteria JSONB,
  ADD COLUMN IF NOT EXISTS warranty_period TEXT,
  ADD COLUMN IF NOT EXISTS guarantee_period TEXT,
  ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_instructions TEXT,
  ADD COLUMN IF NOT EXISTS payment_terms JSONB,
  ADD COLUMN IF NOT EXISTS allow_questions BOOLEAN DEFAULT true;

-- evaluation_deadline optional in UI; backfill from submission_deadline + 7 days
ALTER TABLE public.tenders ALTER COLUMN evaluation_deadline DROP NOT NULL;

UPDATE public.tenders
SET evaluation_deadline = submission_deadline + INTERVAL '7 days'
WHERE evaluation_deadline IS NULL AND submission_deadline IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenders_building_id ON public.tenders(building_id);
CREATE INDEX IF NOT EXISTS idx_tenders_subcategory_id ON public.tenders(subcategory_id);
