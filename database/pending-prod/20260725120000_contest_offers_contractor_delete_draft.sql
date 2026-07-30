-- Allow contractors to delete their own draft contest offers ("Odrzuć szkic").
-- Without FOR DELETE, PostgREST DELETE matches 0 rows under RLS and returns success.

DROP POLICY IF EXISTS "Contractors can delete their own draft offers" ON public.contest_offers;

CREATE POLICY "Contractors can delete their own draft offers"
  ON public.contest_offers
  FOR DELETE
  USING (
    contractor_id = auth.uid()
    AND status = 'draft'
  );
