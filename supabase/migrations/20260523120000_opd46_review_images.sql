-- OPD-46: Review photos and per-job review uniqueness
ALTER TABLE company_reviews
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN company_reviews.image_urls IS 'Public storage URLs for review photos (manager service reviews)';

-- One review per reviewer per job (when job_id is set)
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_reviews_reviewer_job
  ON company_reviews (reviewer_id, job_id)
  WHERE job_id IS NOT NULL;
