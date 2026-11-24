import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import {
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  List as ListIcon,
  Presentation,
} from 'lucide-react';
import { useTenders } from '@/hooks/useTenders';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AddToCalendarMenu } from '@/components/calendar/AddToCalendarMenu';
import { countdownLabel } from '@/lib/dates';
import {
  CalendarEvent,
  CalendarEventKind,
  collectEvents,
  eventKindLabels,
} from '@/lib/calendar';
import { downloadIcs } from '@/lib/calendar-browser';
import type { TenderWithRequirements } from '@/types/tender';
import { cn } from '@/lib/utils';

const KIND_STYLE: Record<CalendarEventKind, { icon: React.ElementType; chip: string; dot: string }> = {
  briefing: {
    icon: Presentation,
    chip: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
    dot: 'bg-blue-500',
  },
  internal_completion: {
    icon: CalendarCheck,
    chip: 'bg-warning/10 text-warning border-warning/30',
    dot: 'bg-warning',
  },
  submission_deadline: {
    icon: CalendarClock,
    chip: 'bg-destructive/10 text-destructive border-destructive/30',
    dot: 'bg-destructive',
  },
};

const ALL_KINDS: CalendarEventKind[] = ['briefing', 'internal_completion', 'submission_deadline'];
const CLOSED_STATUSES = new Set(['submitted', 'completed', 'cancelled', 'rejected']);

/** The moment people care about: deadline events end on the deadline. */
const anchorOf = (e: CalendarEvent) => (e.kind === 'submission_deadline' ? e.end : e.start);

function EventChip({ event, tender, compact = false }: { event: CalendarEvent; tender?: TenderWithRequirements; compact?: boolean }) {
  const style = KIND_STYLE[event.kind];
  const Icon = style.icon;
  return (
    <Link
      to={`/tenders/${event.tenderId}`}
      className={cn(
        'flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs truncate hover:opacity-80',
        style.chip,
      )}
      title={`${eventKindLabels[event.kind]} — ${tender?.tender_reference ?? ''} ${tender?.title ?? ''}`}
    >
      <Icon className="h-3 w-3 flex-shrink-0" />
      {!compact && !event.allDay && <span className="font-medium">{format(anchorOf(event), 'HH:mm')}</span>}
      <span className="truncate">{tender?.tender_reference ?? 'Tender'}</span>
    </Link>
  );
}

export default function KeyDates() {
  const { data: tenders, isLoading } = useTenders();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [kinds, setKinds] = useState<CalendarEventKind[]>(ALL_KINDS);
  const [scope, setScope] = useState<'all' | 'mine'>('all');
  const [hideClosed, setHideClosed] = useState(true);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const tenderById = useMemo(
    () => new Map((tenders ?? []).map((t) => [t.id, t])),
    [tenders],
  );

  const scopedTenders = useMemo(() => {
    const email = profile?.email?.toLowerCase();
    return (tenders ?? []).filter((t) => {
      if (hideClosed && CLOSED_STATUSES.has(t.status)) return false;
      if (scope === 'mine' && (!email || t.assigned_lead_email?.toLowerCase() !== email)) return false;
      return true;
    });
  }, [tenders, profile?.email, scope, hideClosed]);

  const allEvents = useMemo(() => collectEvents(scopedTenders, { kinds }), [scopedTenders, kinds]);

  const today = startOfDay(new Date());
  const upcoming = allEvents.filter((e) => anchorOf(e) >= today);

  // Agenda: group upcoming events by day.
  const agenda = useMemo(() => {
    const groups = new Map<string, CalendarEvent[]>();
    for (const e of upcoming) {
      const key = format(anchorOf(e), 'yyyy-MM-dd');
      groups.set(key, [...(groups.get(key) ?? []), e]);
    }
    return [...groups.entries()];
  }, [upcoming]);

  // Month grid
  const gridDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
  const eventsOn = (day: Date) => allEvents.filter((e) => isSameDay(anchorOf(e), day));

  const counts = {
    briefing: upcoming.filter((e) => e.kind === 'briefing').length,
    internal_completion: upcoming.filter((e) => e.kind === 'internal_completion').length,
    submission_deadline: upcoming.filter((e) => e.kind === 'submission_deadline').length,
  };

  const exportRange = (label: string, from: Date, to?: Date) => {
    const events = allEvents.filter((e) => anchorOf(e) >= from && (!to || anchorOf(e) <= to));
    if (events.length === 0) {
      toast({ title: 'Nothing to export', description: `No matching dates for ${label.toLowerCase()}.` });
      return;
    }
    downloadIcs(events, `tender-dates_${format(new Date(), 'yyyy-MM-dd')}`, 'Tender Tracker – Key Dates');
    toast({
      title: `${events.length} date${events.length === 1 ? '' : 's'} exported`,
      description: 'Open the .ics file to add them to Outlook. Re-importing later updates entries instead of duplicating them.',
    });
  };

  const toggleKind = (kind: CalendarEventKind, on: boolean) =>
    setKinds((prev) => (on ? [...new Set([...prev, kind])] : prev.filter((k) => k !== kind)));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Key Dates</h1>
          <p className="text-muted-foreground mt-1">
            Briefings, internal completion dates and submission deadlines — in one place, ready for Outlook.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Export to Outlook
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-normal text-xs text-muted-foreground">
              Uses the filters on this page. Downloads one .ics file for Outlook.
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => exportRange('Next 7 days', today, addDays(today, 7))}>Next 7 days</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportRange('Next 30 days', today, addDays(today, 30))}>Next 30 days</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportRange('Next 90 days', today, addDays(today, 90))}>Next 90 days</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportRange('All upcoming', today)}>All upcoming dates</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => exportRange(format(month, 'MMMM yyyy'), startOfMonth(month), endOfMonth(month))}
            >
              Month shown ({format(month, 'MMM yyyy')})
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        {ALL_KINDS.map((kind) => {
          const Icon = KIND_STYLE[kind].icon;
          return (
            <Card key={kind}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">Upcoming {eventKindLabels[kind].toLowerCase()}s</p>
                  <p className="text-3xl font-bold">{counts[kind]}</p>
                </div>
                <div className={cn('h-11 w-11 rounded-full flex items-center justify-center border', KIND_STYLE[kind].chip)}>
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
          {ALL_KINDS.map((kind) => (
            <div key={kind} className="flex items-center gap-2">
              <Checkbox
                id={`kind-${kind}`}
                checked={kinds.includes(kind)}
                onCheckedChange={(v) => toggleKind(kind, v === true)}
              />
              <Label htmlFor={`kind-${kind}`} className="flex items-center gap-1.5 cursor-pointer">
                <span className={cn('h-2.5 w-2.5 rounded-full', KIND_STYLE[kind].dot)} />
                {eventKindLabels[kind]}s
              </Label>
            </div>
          ))}
          <div className="flex items-center gap-2 sm:ml-auto">
            <Select value={scope} onValueChange={(v) => setScope(v as 'all' | 'mine')}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tenders</SelectItem>
                <SelectItem value="mine">Tenders I lead</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="hide-closed" checked={hideClosed} onCheckedChange={setHideClosed} />
            <Label htmlFor="hide-closed" className="cursor-pointer">Hide closed tenders</Label>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="agenda">
        <TabsList>
          <TabsTrigger value="agenda"><ListIcon className="mr-2 h-4 w-4" />Agenda</TabsTrigger>
          <TabsTrigger value="month"><CalendarDays className="mr-2 h-4 w-4" />Month</TabsTrigger>
        </TabsList>

        {/* Agenda view */}
        <TabsContent value="agenda">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming</CardTitle>
              <CardDescription>{upcoming.length} upcoming date{upcoming.length === 1 ? '' : 's'}</CardDescription>
            </CardHeader>
            <CardContent>
              {agenda.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No upcoming dates</p>
                  <p className="text-sm">Try changing the filters above.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {agenda.map(([day, events]) => {
                    const date = new Date(`${day}T00:00:00`);
                    const cd = countdownLabel(date);
                    return (
                      <div key={day}>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className={cn('font-semibold', isToday(date) && 'text-primary')}>
                            {format(date, 'EEEE, dd MMMM yyyy')}
                          </h3>
                          <Badge variant="outline" className="text-xs">{cd.text}</Badge>
                        </div>
                        <div className="space-y-2">
                          {events.map((e) => {
                            const t = tenderById.get(e.tenderId);
                            const style = KIND_STYLE[e.kind];
                            const Icon = style.icon;
                            if (!t) return null;
                            return (
                              <div key={e.uid} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border p-3">
                                <div className={cn('h-9 w-9 rounded-full flex items-center justify-center border flex-shrink-0', style.chip)}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium">{eventKindLabels[e.kind]}</span>
                                    <span className="text-sm text-muted-foreground">
                                      {e.allDay ? 'All day' : format(anchorOf(e), 'HH:mm')}
                                    </span>
                                    {e.kind === 'briefing' && t.briefing_compulsory && (
                                      <Badge variant="destructive" className="text-xs">Compulsory</Badge>
                                    )}
                                  </div>
                                  <Link to={`/tenders/${t.id}`} className="block truncate hover:underline">
                                    <span className="font-medium text-primary">{t.tender_reference}</span>
                                    <span className="text-muted-foreground"> · {t.title} · {t.client_name}</span>
                                  </Link>
                                  <p className="text-xs text-muted-foreground">Lead: {t.assigned_lead_name}</p>
                                </div>
                                <AddToCalendarMenu tender={t} kinds={[e.kind]} variant="ghost" className="self-start sm:self-center" />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Month view */}
        <TabsContent value="month">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>{format(month, 'MMMM yyyy')}</CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="Previous month">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setMonth(startOfMonth(new Date()))}>Today</Button>
                <Button variant="outline" size="icon" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Next month">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 text-xs font-medium text-muted-foreground mb-1">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <div key={d} className="px-2 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 border-l border-t rounded-sm overflow-hidden">
                {gridDays.map((day) => {
                  const dayEvents = eventsOn(day);
                  const shown = dayEvents.slice(0, 3);
                  const more = dayEvents.length - shown.length;
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        'min-h-[5.5rem] sm:min-h-[7rem] border-r border-b p-1 flex flex-col gap-1',
                        !isSameMonth(day, month) && 'bg-muted/40 text-muted-foreground',
                      )}
                    >
                      <span
                        className={cn(
                          'text-xs font-medium self-end h-6 w-6 flex items-center justify-center rounded-full',
                          isToday(day) && 'bg-primary text-primary-foreground',
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                      {/* Small screens: dots; larger: chips */}
                      <div className="flex flex-wrap gap-1 sm:hidden">
                        {dayEvents.map((e) => (
                          <span key={e.uid} className={cn('h-2 w-2 rounded-full', KIND_STYLE[e.kind].dot)} />
                        ))}
                      </div>
                      <div className="hidden sm:flex flex-col gap-1">
                        {shown.map((e) => (
                          <EventChip key={e.uid} event={e} tender={tenderById.get(e.tenderId)} />
                        ))}
                        {more > 0 && (
                          <Popover>
                            <PopoverTrigger className="text-xs text-left text-muted-foreground hover:text-foreground">
                              +{more} more
                            </PopoverTrigger>
                            <PopoverContent className="w-64 space-y-1">
                              <p className="text-sm font-medium mb-2">{format(day, 'EEEE, dd MMM')}</p>
                              {dayEvents.map((e) => (
                                <EventChip key={e.uid} event={e} tender={tenderById.get(e.tenderId)} />
                              ))}
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                {ALL_KINDS.map((k) => (
                  <span key={k} className="flex items-center gap-1.5">
                    <span className={cn('h-2.5 w-2.5 rounded-full', KIND_STYLE[k].dot)} />
                    {eventKindLabels[k]}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
