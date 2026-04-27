import { useTenders } from '@/hooks/useTenders';
import { TenderWithRequirements, isTenderOverdue, areAllDocumentsCompiled, tenderStatusLabels } from '@/types/tender';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Users,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { format, differenceInDays, addDays, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { StatusPieChart, DepartmentBarChart, WinLossChart, MonthlyTrendChart } from '@/components/dashboard/AnalyticsCharts';

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  variant = 'default',
  description,
}: { 
  title: string; 
  value: number; 
  icon: React.ElementType;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  description?: string;
}) {
  const variants = {
    default: 'bg-card border',
    success: 'bg-success/10 border-success/20',
    warning: 'bg-warning/10 border-warning/20',
    destructive: 'bg-destructive/10 border-destructive/20',
  };

  const iconVariants = {
    default: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
  };

  return (
    <Card className={cn('transition-all hover:shadow-md', variants[variant])}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className={cn('p-3 rounded-lg bg-background/50', iconVariants[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TenderRow({ tender }: { tender: TenderWithRequirements }) {
  const isOverdue = isTenderOverdue(tender);
  const allCompiled = areAllDocumentsCompiled(tender.tender_requirements);
  const daysUntilDeadline = differenceInDays(new Date(tender.submission_deadline), new Date());

  const statusColors: Record<string, string> = {
    new: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    go_ahead: 'bg-primary/10 text-primary border-primary/20',
    in_progress: 'bg-warning/10 text-warning border-warning/20',
    completed: 'bg-success/10 text-success border-success/20',
    submitted: 'bg-muted text-muted-foreground',
    cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
    rejected: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  };

  return (
    <Link
      to={`/tenders/${tender.id}`}
      className="flex items-center justify-between p-4 bg-card rounded-lg border hover:shadow-md transition-all group"
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={cn(
          'h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0',
          isOverdue ? 'bg-destructive/10' : allCompiled ? 'bg-success/10' : 'bg-primary/10'
        )}>
          <FileText className={cn(
            'h-5 w-5',
            isOverdue ? 'text-destructive' : allCompiled ? 'text-success' : 'text-primary'
          )} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate">{tender.title}</span>
            {isOverdue && (
              <Badge variant="destructive" className="text-xs">Overdue</Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="truncate">{tender.tender_reference}</span>
            <span>•</span>
            <span className="truncate">{tender.client_name}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-right hidden sm:block">
          <p className={cn(
            'text-sm font-medium',
            isOverdue ? 'text-destructive' : daysUntilDeadline <= 3 ? 'text-warning' : 'text-muted-foreground'
          )}>
            {format(new Date(tender.submission_deadline), 'dd MMM yyyy')}
          </p>
          <p className="text-xs text-muted-foreground">{tender.assigned_lead_name}</p>
        </div>
        <Badge className={statusColors[tender.status] || ''} variant="outline">
          {tenderStatusLabels[tender.status] || tender.status}
        </Badge>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { data: tenders, isLoading } = useTenders();
  const { canManageTenders } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const allTenders = tenders ?? [];
  const activeTenders = allTenders.filter(t => t.status !== 'submitted' && t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'rejected');
  const overdueTenders = allTenders.filter(isTenderOverdue);
  const submittedTenders = allTenders.filter(t => t.status === 'submitted');
  const missingDocs = allTenders.filter(t => 
    t.status !== 'submitted' && t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'rejected' && !areAllDocumentsCompiled(t.tender_requirements)
  );

  // Group by status
  const byStatus = {
    new: allTenders.filter(t => t.status === 'new'),
    go_ahead: allTenders.filter(t => t.status === 'go_ahead'),
    in_progress: allTenders.filter(t => t.status === 'in_progress'),
    completed: allTenders.filter(t => t.status === 'completed'),
    submitted: submittedTenders,
    cancelled: allTenders.filter(t => t.status === 'cancelled'),
    rejected: allTenders.filter(t => t.status === 'rejected'),
  };

  // Group by assigned lead
  const byLead = allTenders.reduce((acc, tender) => {
    const lead = tender.assigned_lead_name;
    if (!acc[lead]) acc[lead] = [];
    acc[lead].push(tender);
    return acc;
  }, {} as Record<string, TenderWithRequirements[]>);

  // Upcoming deadlines (next 7 days)
  const upcomingDeadlines = activeTenders
    .filter(t => {
      const days = differenceInDays(new Date(t.submission_deadline), new Date());
      return days >= 0 && days <= 7;
    })
    .sort((a, b) => 
      new Date(a.submission_deadline).getTime() - new Date(b.submission_deadline).getTime()
    );

  // Due for internal completion tomorrow
  const tomorrow = addDays(startOfDay(new Date()), 1);
  const dueForCompletionTomorrow = activeTenders.filter(t => {
    if (!t.internal_completion_date) return false;
    const completionDate = startOfDay(new Date(t.internal_completion_date));
    return completionDate.getTime() === tomorrow.getTime();
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Track your tender submissions and compliance status
          </p>
        </div>
        {canManageTenders && (
          <Button asChild>
            <Link to="/tenders/new">
              <FileText className="mr-2 h-4 w-4" />
              New Tender
            </Link>
          </Button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Tenders"
          value={activeTenders.length}
          icon={FileText}
          description="Currently in progress"
        />
        <StatCard
          title="Overdue"
          value={overdueTenders.length}
          icon={AlertTriangle}
          variant={overdueTenders.length > 0 ? 'destructive' : 'default'}
          description="Past deadline, not submitted"
        />
        <StatCard
          title="Missing Documents"
          value={missingDocs.length}
          icon={AlertCircle}
          variant={missingDocs.length > 0 ? 'warning' : 'default'}
          description="Awaiting compliance items"
        />
        <StatCard
          title="Submitted"
          value={submittedTenders.length}
          icon={CheckCircle2}
          variant="success"
          description="Successfully completed"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Overdue Tenders */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Overdue Tenders
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/tenders?filter=overdue">View All</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {overdueTenders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-success" />
                <p className="font-medium">No overdue tenders</p>
                <p className="text-sm">All submissions are on track</p>
              </div>
            ) : (
              overdueTenders.slice(0, 5).map((tender) => (
                <TenderRow key={tender.id} tender={tender} />
              ))
            )}
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-warning" />
              Upcoming (7 days)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingDeadlines.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No deadlines in the next 7 days</p>
              </div>
            ) : (
              upcomingDeadlines.slice(0, 5).map((tender) => {
                const days = differenceInDays(new Date(tender.submission_deadline), new Date());
                return (
                  <Link
                    key={tender.id}
                    to={`/tenders/${tender.id}`}
                    className="block p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate">{tender.title}</p>
                      <Badge variant={days <= 2 ? 'destructive' : 'secondary'} className="text-xs">
                        {days === 0 ? 'Today' : `${days}d`}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{tender.client_name}</p>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Due for Completion Tomorrow */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            Due for Completion Tomorrow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dueForCompletionTomorrow.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No tenders due for internal completion tomorrow</p>
            </div>
          ) : (
            dueForCompletionTomorrow.map((tender) => (
              <TenderRow key={tender.id} tender={tender} />
            ))
          )}
        </CardContent>
      </Card>

      {/* Analytics Charts */}
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        <StatusPieChart tenders={allTenders} />
        <DepartmentBarChart tenders={allTenders} />
        <WinLossChart tenders={allTenders} />
        <MonthlyTrendChart tenders={allTenders} />
      </div>

      {/* Status Distribution & Team Workload */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* By Status */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tenders by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(byStatus).map(([status, items]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-3 h-3 rounded-full',
                      status === 'new' && 'bg-blue-500',
                      status === 'go_ahead' && 'bg-primary',
                      status === 'in_progress' && 'bg-warning',
                      status === 'completed' && 'bg-success',
                      status === 'submitted' && 'bg-muted-foreground',
                      status === 'cancelled' && 'bg-destructive',
                      status === 'rejected' && 'bg-orange-500',
                    )} />
                    <span className="font-medium">{tenderStatusLabels[status as keyof typeof tenderStatusLabels] || status}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-muted rounded-full h-2">
                      <div 
                        className={cn(
                          'h-2 rounded-full',
                          status === 'new' && 'bg-blue-500',
                          status === 'go_ahead' && 'bg-primary',
                          status === 'in_progress' && 'bg-warning',
                          status === 'completed' && 'bg-success',
                          status === 'submitted' && 'bg-muted-foreground',
                          status === 'cancelled' && 'bg-destructive',
                          status === 'rejected' && 'bg-orange-500',
                        )}
                        style={{ 
                          width: `${allTenders.length ? (items.length / allTenders.length) * 100 : 0}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-8 text-right">{items.length}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* By Assigned Lead */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Workload by Lead
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(byLead).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No tenders assigned yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(byLead)
                  .sort(([, a], [, b]) => b.length - a.length)
                  .slice(0, 5)
                  .map(([lead, items]) => {
                    const overdue = items.filter(isTenderOverdue).length;
                    return (
                      <div key={lead} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-semibold text-primary">
                              {lead.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                          <span className="font-medium">{lead}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{items.length}</Badge>
                          {overdue > 0 && (
                            <Badge variant="destructive">{overdue} overdue</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
