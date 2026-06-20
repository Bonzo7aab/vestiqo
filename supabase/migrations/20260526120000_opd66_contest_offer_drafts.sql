-- OPD-66: Contest offer drafts, offer_details JSONB, bid-attachments storage

-- Draft status + structured contest offer payload
ALTER TABLE public.tender_bids
  DROP CONSTRAINT IF EXISTS tender_bids_status_check;

ALTER TABLE public.tender_bids
  ADD CONSTRAINT tender_bids_status_check
  CHECK (status IN (
    'draft',
    'submitted',
    'under_review',
    'shortlisted',
    'accepted',
    'rejected',
    'cancelled'
  ));

ALTER TABLE public.tender_bids
  ADD COLUMN IF NOT EXISTS offer_details JSONB;

COMMENT ON COLUMN public.tender_bids.offer_details IS
  'OPD-66 contest offer wizard payload (VAT, warranty, formal docs, confirmations)';

-- Exclude drafts from public bid counts
CREATE OR REPLACE FUNCTION public.update_tender_bids_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.tenders
  SET bids_count = (
    SELECT COUNT(*)
    FROM public.tender_bids
    WHERE tender_id = COALESCE(NEW.tender_id, OLD.tender_id)
      AND status NOT IN ('cancelled', 'draft')
  )
  WHERE id = COALESCE(NEW.tender_id, OLD.tender_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- One active draft per tender + company
CREATE UNIQUE INDEX IF NOT EXISTS idx_tender_bids_one_draft_per_company
  ON public.tender_bids (tender_id, company_id)
  WHERE status = 'draft';

-- bid-attachments bucket (private; signed URLs for managers via existing patterns later)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bid-attachments',
  'bid-attachments',
  false,
  10485760,
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload bid attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view bid attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update bid attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete bid attachments" ON storage.objects;

CREATE POLICY "Users can upload bid attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bid-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view bid attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'bid-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update bid attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'bid-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'bid-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete bid attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'bid-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
