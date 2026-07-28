CREATE POLICY "Team members can view their tenders"
ON public.tenders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tender_team_members ttm
    WHERE ttm.tender_id = tenders.id
      AND ttm.user_id = auth.uid()
  )
);