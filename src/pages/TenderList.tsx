import { useState } from 'react';
import { useTenders, useUpdateTenderStatus } from '@/hooks/useTenders';
import { TenderWithRequirements, TenderStatus, isTenderOverdue, areAllDocumentsCompiled, tenderStatusLabels } from '@/types/tender';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  FileText, 
  AlertTriangle,
  Upload,
  CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function TenderList() {
  const { data: tenders, isLoading } = useTenders();
  const { canManageTenders } = useAuth();
  const [searchParams] = useSearchParams();
  const updateStatus = useUpdateTenderStatus();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('filter') || 'all');
  const [leadFilter, setLeadFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const allTenders = tenders ?? [];
  const pendingApproval = allTenders.filter(t => t.status === 'new');

  // Get unique leads
  const leads = [...new Set(allTenders.map(t => t.assigned_lead_name).filter((lead): lead is string => !!lead?.trim()))].sort();

  // Start with tab filter
  let filteredTenders = activeTab === 'pending_approval' 
    ? pendingApproval 
    : allTenders;

  // Apply search
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredTenders = filteredTenders.filter(t =>
      t.title.toLowerCase().includes(query) ||
      t.tender_reference.toLowerCase().includes(query) ||
      t.client_name.toLowerCase().includes(query) ||
      t.assigned_lead_name.toLowerCase().includes(query)
    );
  }

  // Apply status filter (only on "all" tab)
  if (activeTab === 'all' && statusFilter !== 'all') {
    if (statusFilter === 'overdue') {
      filteredTenders = filteredTenders.filter(isTenderOverdue);
    } else if (statusFilter === 'missing_docs') {
      filteredTenders = filteredTenders.filter(t => 
        t.status !== 'submitted' && !areAllDocumentsCompiled(t.tender_requirements)
      );
    } else {
      filteredTenders = filteredTenders.filter(t => t.status === statusFilter);
    }
  }

  // Apply lead filter
  if (leadFilter !== 'all') {
    filteredTenders = filteredTenders.filter(t => t.assigned_lead_name === leadFilter);
  }

  // Apply department filter
  if (departmentFilter !== 'all') {
    filteredTenders = filteredTenders.filter(t => t.department === departmentFilter);
  }

  // Apply date range filter
  if (dateFrom) {
    filteredTenders = filteredTenders.filter(t => new Date(t.submission_deadline) >= new Date(dateFrom));
  }
  if (dateTo) {
    filteredTenders = filteredTenders.filter(t => new Date(t.submission_deadline) <= new Date(dateTo + 'T23:59:59'));
  }

  const statusColors: Record<string, string> = {
    new: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    go_ahead: 'bg-primary/10 text-primary border-primary/20',
    in_progress: 'bg-warning/10 text-warning border-warning/20',
    completed: 'bg-success/10 text-success border-success/20',
    submitted: 'bg-muted text-muted-foreground',
    cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
    rejected: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  };

  const handleApprove = async (tenderId: string) => {
    try {
      await updateStatus.mutateAsync({ id: tenderId, status: 'go_ahead' });
      toast({
        title: 'Tender approved',
        description: 'Status changed to Approved.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to approve tender',
      });
    }
  };

  const handleReject = async (tenderId: string) => {
    try {
      await updateStatus.mutateAsync({ id: tenderId, status: 'rejected' });
      toast({
        title: 'Tender rejected',
        description: 'Status changed to Rejected.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to reject tender',
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">All Tenders</h1>
          <p className="text-muted-foreground mt-1">
            {filteredTenders.length} tender{filteredTenders.length !== 1 ? 's' : ''} found
          </p>
        </div>
        {canManageTenders && (
          <div className="flex gap-2">
            
            <Button asChild>
              <Link to="/tenders/new">
                <Plus className="mr-2 h-4 w-4" />
                New Tender
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Tenders</TabsTrigger>
          <TabsTrigger value="pending_approval" className="relative">
            Pending Approval
            {pendingApproval.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {pendingApproval.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, reference, client, or lead..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {activeTab === 'all' && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="go_ahead">Approved</SelectItem>
                <SelectItem value="in_progress">In-Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="missing_docs">Missing Documents</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="Resourcing">Resourcing</SelectItem>
              <SelectItem value="Consulting">Consulting</SelectItem>
              <SelectItem value="Technology">Technology</SelectItem>
            </SelectContent>
          </Select>
          <Select value={leadFilter} onValueChange={setLeadFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by lead" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leads</SelectItem>
              {leads.map(lead => (
                <SelectItem key={lead} value={lead}>{lead}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Deadline From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full sm:w-44"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Deadline To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full sm:w-44"
            />
          </div>
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>
              Clear dates
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="hidden md:table-cell">Client</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead className="hidden lg:table-cell">Lead</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Department</TableHead>
              {activeTab === 'pending_approval' && canManageTenders && (
                <TableHead>Action</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTenders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={activeTab === 'pending_approval' ? 8 : 7} className="h-32 text-center">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    {activeTab === 'pending_approval' ? 'No tenders pending approval' : 'No tenders found'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredTenders.map((tender) => {
                const isOverdue = isTenderOverdue(tender);
                
                return (
                  <TableRow key={tender.id} className="cursor-pointer hover:bg-accent/50">
                    <TableCell>
                      <Link to={`/tenders/${tender.id}`} className="font-medium text-primary hover:underline">
                        {tender.tender_reference}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link to={`/tenders/${tender.id}`} className="hover:underline">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[200px]">{tender.title}</span>
                          {isOverdue && (
                            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                          )}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {tender.client_name}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        isOverdue && 'text-destructive font-medium'
                      )}>
                        {format(new Date(tender.submission_deadline), 'dd MMM yyyy')}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {tender.assigned_lead_name}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[tender.status] || ''} variant="outline">
                        {tenderStatusLabels[tender.status] || tender.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {tender.department || '—'}
                    </TableCell>
                    {activeTab === 'pending_approval' && canManageTenders && (
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={(e) => {
                              e.preventDefault();
                              handleApprove(tender.id);
                            }}
                            disabled={updateStatus.isPending}
                          >
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                            Approve
                          </Button>
                          <Button 
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                              e.preventDefault();
                              handleReject(tender.id);
                            }}
                            disabled={updateStatus.isPending}
                          >
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
