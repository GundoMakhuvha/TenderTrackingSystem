import { useState } from 'react';
import { BellRing, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface Props {
  tenderId: string;
  onDone: () => void;
}

/**
 * Shown after a tender's dates are edited. Sends the lead and team an
 * "updated dates" email whose calendar file replaces their old Outlook entries.
 */
export function NotifyDatesChanged({ tenderId, onDone }: Props) {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    const { data, error } = await supabase.functions.invoke('send-notification-email', {
      body: { tender_id: tenderId, action: 'dates_changed' },
    });
    setSending(false);
    if (error || data?.error) {
      toast({
        variant: 'destructive',
        title: 'Update not sent',
        description: data?.error || error?.message || 'Please try again.',
      });
      return;
    }
    const sent: string[] = data?.sent ?? [];
    toast({
      title: sent.length ? `Update sent to ${sent.length} ${sent.length === 1 ? 'person' : 'people'}` : 'Nobody to notify',
      description: sent.length
        ? 'They received the new dates with a calendar file that updates their Outlook entries.'
        : 'This tender has no lead or team members with an email address yet.',
    });
    onDone();
  };

  return (
    <div
      role="status"
      className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4"
    >
      <BellRing className="h-5 w-5 text-primary flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium">The dates for this tender have changed.</p>
        <p className="text-sm text-muted-foreground">
          Let the lead and team know? They'll get the new dates and a calendar file that updates their Outlook.
        </p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={send} disabled={sending}>
          {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellRing className="mr-2 h-4 w-4" />}
          Notify team
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone} disabled={sending} aria-label="Dismiss">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
