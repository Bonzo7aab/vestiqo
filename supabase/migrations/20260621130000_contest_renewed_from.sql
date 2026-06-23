-- Track contest renewal chain when manager uses "Ponów" (duplicate flow).

ALTER TABLE contests
  ADD COLUMN IF NOT EXISTS renewed_from_contest_id UUID REFERENCES contests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS contests_renewed_from_contest_id_idx
  ON contests (renewed_from_contest_id)
  WHERE renewed_from_contest_id IS NOT NULL;

COMMENT ON COLUMN contests.renewed_from_contest_id IS
  'Previous contest edition when created via manager Ponów (duplicate) flow';
