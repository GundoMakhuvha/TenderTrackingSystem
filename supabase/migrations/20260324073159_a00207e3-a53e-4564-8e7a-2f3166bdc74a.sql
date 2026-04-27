
CREATE TABLE public.tender_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tender_id, user_id)
);

ALTER TABLE public.tender_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Can view team members if can manage tender"
  ON public.tender_team_members FOR SELECT
  TO authenticated
  USING (can_manage_tender(auth.uid(), tender_id));

CREATE POLICY "Admins and bids team can manage team members"
  ON public.tender_team_members FOR ALL
  TO authenticated
  USING (is_admin_or_bids_team(auth.uid()));

CREATE POLICY "Assigned users can view team members of their tenders"
  ON public.tender_team_members FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenders t
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE t.id = tender_team_members.tender_id
    AND t.assigned_lead_email = p.email
  ));
