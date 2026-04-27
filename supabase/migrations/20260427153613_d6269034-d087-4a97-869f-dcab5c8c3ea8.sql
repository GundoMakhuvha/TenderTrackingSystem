-- Allow the assigned lead to update their own tender (admins already covered by existing policy)
CREATE POLICY "Assigned leads can update their tenders"
ON public.tenders
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.email = tenders.assigned_lead_email
  )
);
