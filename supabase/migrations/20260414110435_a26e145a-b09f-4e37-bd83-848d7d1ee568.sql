
DROP POLICY "System can insert notifications" ON public.notifications;
CREATE POLICY "Only admin or bids team can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (is_admin_or_bids_team(auth.uid()));
