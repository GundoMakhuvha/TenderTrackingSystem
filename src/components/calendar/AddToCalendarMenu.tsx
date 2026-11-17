import { format } from 'date-fns';
import { CalendarPlus, Download, ExternalLink, Building2, Mail } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  CalendarEvent,
  CalendarEventKind,
  downloadIcs,
  eventKindLabels,
  getTenderEvents,
  openInOutlookWeb,
  safeFileName,
} from '@/lib/calendar';
import type { Tender } from '@/types/tender';

function whenLabel(e: CalendarEvent) {
  if (e.allDay) return format(e.start, 'EEE dd MMM yyyy');
  // Deadline events end on the deadline itself; show that moment.
  const anchor = e.kind === 'submission_deadline' ? e.end : e.start;
  return format(anchor, 'EEE dd MMM yyyy, HH:mm');
}

function EventActions({ event, fileBase }: { event: CalendarEvent; fileBase: string }) {
  const { toast } = useToast();
  return (
    <>
      <DropdownMenuItem onClick={() => openInOutlookWeb(event, 'work')}>
        <Building2 className="mr-2 h-4 w-4" />
        Outlook (work / Microsoft 365)
        <ExternalLink className="ml-auto h-3 w-3 opacity-60" />
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => openInOutlookWeb(event, 'personal')}>
        <Mail className="mr-2 h-4 w-4" />
        Outlook.com (personal)
        <ExternalLink className="ml-auto h-3 w-3 opacity-60" />
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => {
          downloadIcs([event], `${fileBase}_${event.kind}`);
          toast({ title: 'Calendar file downloaded', description: 'Open the .ics file to add it to Outlook desktop.' });
        }}
      >
        <Download className="mr-2 h-4 w-4" />
        Outlook desktop (.ics)
      </DropdownMenuItem>
    </>
  );
}

interface AddToCalendarMenuProps {
  tender: Parameters<typeof getTenderEvents>[0] & Partial<Pick<Tender, 'title'>>;
  /** Limit the menu to specific date types (e.g. just the briefing). */
  kinds?: CalendarEventKind[];
  label?: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  className?: string;
}

/**
 * "Add to Outlook" button for a single tender. Offers each date (briefing,
 * internal completion, submission deadline) via Outlook web or .ics, plus a
 * one-click download of every date for the tender.
 */
export function AddToCalendarMenu({
  tender,
  kinds,
  label = 'Add to Outlook',
  variant = 'outline',
  size = 'sm',
  className,
}: AddToCalendarMenuProps) {
  const { toast } = useToast();
  const events = getTenderEvents(tender).filter((e) => !kinds || kinds.includes(e.kind));
  const fileBase = safeFileName(tender.tender_reference);

  if (events.length === 0) {
    return (
      <Button variant={variant} size={size} className={className} disabled title="No dates captured yet">
        <CalendarPlus className="mr-2 h-4 w-4" />
        {label}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <CalendarPlus className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {events.length === 1 ? (
          <>
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{eventKindLabels[events[0].kind]}</p>
              <p className="text-xs text-muted-foreground">{whenLabel(events[0])}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <EventActions event={events[0]} fileBase={fileBase} />
          </>
        ) : (
          <>
            <DropdownMenuLabel>Choose a date to add</DropdownMenuLabel>
            {events.map((e) => (
              <DropdownMenuSub key={e.uid}>
                <DropdownMenuSubTrigger className="flex-col items-start gap-0">
                  <span className="text-sm">{eventKindLabels[e.kind]}</span>
                  <span className="text-xs text-muted-foreground">{whenLabel(e)}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-64">
                  <EventActions event={e} fileBase={fileBase} />
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                downloadIcs(events, `${fileBase}_all-dates`, `Tender ${tender.tender_reference}`);
                toast({
                  title: `${events.length} dates downloaded`,
                  description: 'Open the .ics file to add them all to Outlook in one go.',
                });
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              All {events.length} dates (.ics)
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
