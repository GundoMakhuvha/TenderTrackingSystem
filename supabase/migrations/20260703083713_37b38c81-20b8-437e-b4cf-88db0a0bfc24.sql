
CREATE OR REPLACE FUNCTION public.is_tender_team_member(_user_id uuid, _tender_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.tender_team_members WHERE tender_id = _tender_id AND user_id = _user_id)
$$;

DROP POLICY IF EXISTS "Team members can view their tenders" ON public.tenders;
CREATE POLICY "Team members can view their tenders" ON public.tenders
FOR SELECT USING (public.is_tender_team_member(auth.uid(), id));
