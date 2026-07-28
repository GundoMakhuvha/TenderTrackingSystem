create extension if not exists pg_net with schema extensions;

create or replace function public.send_notification_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://zvxzwqibgkulchrzparb.supabase.co/functions/v1/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-hook-secret', '21d390e7fa454637ac3b0a695b554de9b9791962dfaaa818'
    ),
    body := jsonb_build_object('notification_id', NEW.id)
  );
  return NEW;
exception when others then
  raise warning 'send_notification_email failed: %', sqlerrm;
  return NEW;
end;
$$;

drop trigger if exists trg_send_notification_email on public.notifications;
create trigger trg_send_notification_email
after insert on public.notifications
for each row execute function public.send_notification_email();