
-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  tender_id UUID REFERENCES public.tenders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function: notify on new tender
CREATE OR REPLACE FUNCTION public.notify_new_tender()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lead_user_id UUID;
BEGIN
  SELECT id INTO _lead_user_id FROM public.profiles WHERE email = NEW.assigned_lead_email LIMIT 1;
  IF _lead_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, message, tender_id)
    VALUES (_lead_user_id, 'new_tender', 'New tender "' || NEW.title || '" has been registered and assigned to ' || NEW.assigned_lead_name, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_tender
AFTER INSERT ON public.tenders
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_tender();

-- Function: notify on status change
CREATE OR REPLACE FUNCTION public.notify_tender_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lead_user_id UUID;
  _status_label TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('go_ahead', 'completed', 'submitted', 'rejected', 'cancelled') THEN
    _status_label := REPLACE(NEW.status::text, '_', ' ');
    SELECT id INTO _lead_user_id FROM public.profiles WHERE email = NEW.assigned_lead_email LIMIT 1;
    IF _lead_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, message, tender_id)
      VALUES (_lead_user_id, 'status_change', 'Tender "' || NEW.title || '" has been marked as ' || _status_label, NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_tender_status_change
AFTER UPDATE ON public.tenders
FOR EACH ROW
EXECUTE FUNCTION public.notify_tender_status_change();
