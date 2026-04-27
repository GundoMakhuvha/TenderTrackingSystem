
-- Trigger: notify team members on status change (in addition to lead)
CREATE OR REPLACE FUNCTION public.notify_tender_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _lead_user_id UUID;
  _status_label TEXT;
  _team_member RECORD;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('go_ahead', 'completed', 'submitted', 'rejected', 'cancelled') THEN
    _status_label := REPLACE(NEW.status::text, '_', ' ');
    
    -- Notify assigned lead
    SELECT id INTO _lead_user_id FROM public.profiles WHERE email = NEW.assigned_lead_email LIMIT 1;
    IF _lead_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, message, tender_id)
      VALUES (_lead_user_id, 'status_change', 'Tender "' || NEW.title || '" has been marked as ' || _status_label, NEW.id);
    END IF;

    -- Notify all team members (excluding the lead to avoid duplicates)
    FOR _team_member IN
      SELECT ttm.user_id FROM public.tender_team_members ttm
      WHERE ttm.tender_id = NEW.id AND ttm.user_id IS DISTINCT FROM _lead_user_id
    LOOP
      INSERT INTO public.notifications (user_id, type, message, tender_id)
      VALUES (_team_member.user_id, 'status_change', 'Tender "' || NEW.title || '" has been marked as ' || _status_label, NEW.id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- New function: notify user when added to a tender team
CREATE OR REPLACE FUNCTION public.notify_team_member_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _tender_title TEXT;
BEGIN
  SELECT title INTO _tender_title FROM public.tenders WHERE id = NEW.tender_id;
  IF _tender_title IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, message, tender_id)
    VALUES (NEW.user_id, 'team_assignment', 'You have been added to the team for tender "' || _tender_title || '"', NEW.tender_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for team member assignment notifications
CREATE TRIGGER trg_notify_team_member_added
  AFTER INSERT ON public.tender_team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_team_member_added();

-- Also notify lead when tender is reassigned to them
CREATE OR REPLACE FUNCTION public.notify_tender_reassigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _new_lead_user_id UUID;
BEGIN
  IF OLD.assigned_lead_email IS DISTINCT FROM NEW.assigned_lead_email THEN
    SELECT id INTO _new_lead_user_id FROM public.profiles WHERE email = NEW.assigned_lead_email LIMIT 1;
    IF _new_lead_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, message, tender_id)
      VALUES (_new_lead_user_id, 'reassignment', 'Tender "' || NEW.title || '" has been reassigned to you', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_tender_reassigned
  AFTER UPDATE ON public.tenders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_tender_reassigned();
