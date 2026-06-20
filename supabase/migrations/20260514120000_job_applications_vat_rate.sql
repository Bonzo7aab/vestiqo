-- KAN-17: VAT rate on job applications (net price in proposed_price; VAT 8% or 23%).

ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS vat_rate SMALLINT;

UPDATE job_applications
SET vat_rate = 23
WHERE vat_rate IS NULL;

ALTER TABLE job_applications
  ALTER COLUMN vat_rate SET NOT NULL,
  ALTER COLUMN vat_rate SET DEFAULT 23;

ALTER TABLE job_applications
  DROP CONSTRAINT IF EXISTS job_applications_vat_rate_check;

ALTER TABLE job_applications
  ADD CONSTRAINT job_applications_vat_rate_check
  CHECK (vat_rate IN (8, 23));
