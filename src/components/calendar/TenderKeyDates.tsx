import { format } from 'date-fns';
import { countdownLabel } from '@/lib/dates';
import { CalendarCheck, CalendarClock, Presentation } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AddToCalendarMenu } from '@/components/calendar/AddToCalendarMenu';
import { CalendarEventKind, eventKindLabels, getTenderEvents } from '@/lib/calendar';

type TenderArg = Parameters<typeof getTenderEvents>[0] & { briefing_attended?: boolean | null };

const ICONS: Record<CalendarEventKind, React.ElementType> = {
  briefing: Presentation,
  internal_completion: CalendarCheck,
  submission_deadline: CalendarClock,
};

const ORDER: CalendarEventKind[] = ['briefing', 'internal_completion', 'submission_deadline'];

const toneClass = {
  urgent: 'bg-destructive/10 text-destructive border-destructive/20',
  soon: 'bg-warning/10 text-warning border-warning/20',
  later: 'bg-primary/10 text-primary border-primary/20',
  past: 'bg-muted text-muted-foreground',
};

/** Three-tile summary of a tender's dates with countdowns and Outlook buttons. */
export function TenderKeyDates({ tender }: { tender: TenderArg }) {
  const events = getTenderEvents(tender);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Key Dates</CardTitle>
        <CardDescription>Add any of these to your Outlook calendar, or use "Add to Outlook" at the top for all of them.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          {ORDER.map((kind) => {
            const Icon = ICONS[kind];
            const event = events.find((e) => e.kind === kind);
            const anchor = event ? (kind === 'submission_deadline' ? event.end : event.start) : null;
            const cd = anchor ? countdownLabel(anchor) : null;
            const attendedBriefing = kind === 'briefing' && tender.briefing_attended;

            return (
              <div key={kind} className="rounded-lg border p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {eventKindLabels[kind]}
                  </span>
                  {cd && !attendedBriefing && (
                    <Badge variant="outline" className={cn('text-xs', toneClass[cd.tone])}>
                      {cd.text}
                    </Badge>
                  )}
                  {attendedBriefing && (
                    <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                      Attended
                    </Badge>
                  )}
                </div>
                {event && anchor ? (
                  <>
                    <p className="text-lg font-semibold leading-tight">
                      {format(anchor, 'EEE dd MMM yyyy')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {event.allDay ? 'All day' : format(anchor, 'HH:mm')}
                      {kind === 'briefing' && tender.briefing_compulsory && (
                        <span className="ml-2 font-medium text-destructive">• Compulsory</span>
                      )}
                    </p>
                    <AddToCalendarMenu
                      tender={tender}
                      kinds={[kind]}
                      label="Add to Outlook"
                      variant="ghost"
                      className="mt-auto -ml-2 self-start"
                    />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Not captured yet
                    {kind === 'briefing' && (
                      <span className="block text-xs mt-1">Add a briefing date in Briefing Information below to put it in Outlook.</span>
                    )}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
