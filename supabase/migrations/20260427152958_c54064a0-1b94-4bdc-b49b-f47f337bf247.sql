-- Add updated_by column to track who last edited a tender
ALTER TABLE public.tenders
  ADD COLUMN IF NOT EXISTS updated_by uuid;

-- Trigger function to stamp updated_by with the current authenticated user
CREATE OR REPLACE FUNCTION public.set_tender_updated_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_tender_updated_by ON public.tenders;
CREATE TRIGGER trg_set_tender_updated_by
BEFORE UPDATE ON public.tenders
FOR EACH ROW
EXECUTE FUNCTION public.set_tender_updated_by();

-- Restrict tender editing to admins only.
-- Drop the existing update policies that allowed bids_team and assigned leads to edit.
DROP POLICY IF EXISTS "Admins and bids team can update any tender" ON public.tenders;
DROP POLICY IF EXISTS "Assigned users can update their tenders" ON public.tenders;

-- Recreate a single update policy: admins only.
CREATE POLICY "Only admins can update tenders"
ON public.tenders
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));
