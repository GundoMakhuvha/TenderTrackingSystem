import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTender, useUpdateTenderStatus, useUpdateTenderRequirements, useDeleteTender, useUpdateTender } from '@/hooks/useTenders';
import { isTenderOverdue, areAllDocumentsCompiled, TenderStatus, QuoteStatus, DocumentStatus, TechnicalStatus, OutcomeStatus, tenderStatusLabels } from '@/types/tender';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { AttachmentUpload } from '@/components/tender/AttachmentUpload';
import { useAttachments, useViewAttachment, useDownloadAttachment } from '@/hooks/useAttachments';
import { ReassignLeadDialog } from '@/components/tender/ReassignLeadDialog';
import { TeamMembersSection } from '@/components/tender/TeamMembersSection';
import { TenderPdfReport } from '@/components/tender/TenderPdfReport';
import { 
  ArrowLeft, 
  Calendar, 
  Building2, 
  User, 
  Mail, 
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trash2,
  FileText,
  CalendarDays,
  Timer,
  Star,
  Target,
  Paperclip,
  Eye,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function TenderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canManageTenders, isAdmin, profile } = useAuth();
  
  const { data: tender, isLoading } = useTender(id);
  const isAssignedLead = !!profile?.email && !!tender?.assigned_lead_email
    && profile.email.toLowerCase() === tender.assigned_lead_email.toLowerCase();
  const canEdit = isAdmin || isAssignedLead;
  const updateStatus = useUpdateTenderStatus();
  const updateRequirements = useUpdateTenderRequirements();
  const updateTender = useUpdateTender();
  const deleteTender = useDeleteTender();
  const { data: allAttachments } = useAttachments(id);
  const viewAttachment = useViewAttachment();
  const downloadAttachmentMutation = useDownloadAttachment();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Tender not found</h2>
        <p className="text-muted-foreground mb-4">The tender you're looking for doesn't exist or you don't have access.</p>
        <Button asChild>
          <Link to="/tenders">Back to Tenders</Link>
        </Button>
      </div>
    );
  }

  const isOverdue = isTenderOverdue(tender);
  const allCompiled = areAllDocumentsCompiled(tender.tender_requirements);
  const requirements = tender.tender_requirements;

  const handleStatusChange = async (status: TenderStatus) => {
    try {
      await updateStatus.mutateAsync({ id: tender.id, status });
      toast({
        title: 'Status updated',
        description: `Tender status changed to ${status}`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update status',
      });
    }
  };

  const handleRequirementChange = async (field: string, value: any) => {
    if (!tender.tender_requirements) return;
    
    try {
      await updateRequirements.mutateAsync({
        tenderId: tender.id,
        updates: { [field]: value },
      });
      toast({
        title: 'Requirement updated',
        description: 'The checklist has been updated.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update requirement',
      });
    }
  };

  const handleTenderFieldChange = async (field: string, value: any) => {
    try {
      await updateTender.mutateAsync({
        id: tender.id,
        updates: { [field]: value },
      });
      toast({
        title: 'Updated',
        description: 'Tender has been updated.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update',
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTender.mutateAsync(tender.id);
      toast({
        title: 'Tender deleted',
        description: 'The tender has been deleted.',
      });
      navigate('/tenders');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete tender',
      });
    }
  };

  const statusColors: Record<string, string> = {
    new: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    go_ahead: 'bg-primary/10 text-primary border-primary/20',
    in_progress: 'bg-warning/10 text-warning border-warning/20',
    completed: 'bg-success/10 text-success border-success/20',
    submitted: 'bg-muted text-muted-foreground',
    cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
    rejected: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  };

  const outcomeStatusLabels = {
    completed: 'Completed',
    in_progress: 'In Progress',
    not_started: 'Not Started',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/tenders">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{tender.title}</h1>
              {isOverdue && (
                <Badge variant="destructive">Overdue</Badge>
              )}
              {allCompiled && tender.status !== 'submitted' && (
                <Badge className="bg-success/10 text-success border-success/20" variant="outline">
                  All Docs Ready
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">{tender.tender_reference}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TenderPdfReport tender={tender} />
          {isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Tender</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this tender? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Tender Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={tender.status} onValueChange={handleStatusChange} disabled={!canEdit}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="go_ahead">Approved</SelectItem>
                <SelectItem value="in_progress">In-Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Badge className={cn(statusColors[tender.status] || '', 'text-sm')} variant="outline">
              {tenderStatusLabels[tender.status] || tender.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Editable Core Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Tender Information</CardTitle>
          <CardDescription>Edit the core tender details. Changes save automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <fieldset disabled={!canEdit} className="space-y-4 disabled:opacity-90">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                defaultValue={tender.title}
                onBlur={(e) => e.target.value !== tender.title && handleTenderFieldChange('title', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tender Reference</Label>
              <Input
                defaultValue={tender.tender_reference}
                onBlur={(e) => e.target.value !== tender.tender_reference && handleTenderFieldChange('tender_reference', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Client</Label>
            <Input
              defaultValue={tender.client_name}
              onBlur={(e) => e.target.value !== tender.client_name && handleTenderFieldChange('client_name', e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Submission Deadline</Label>
              <Input
                type="datetime-local"
                defaultValue={tender.submission_deadline ? format(new Date(tender.submission_deadline), "yyyy-MM-dd'T'HH:mm") : ''}
                onBlur={(e) => {
                  if (!e.target.value) return;
                  const iso = new Date(e.target.value).toISOString();
                  if (iso !== tender.submission_deadline) handleTenderFieldChange('submission_deadline', iso);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Internal Completion Date</Label>
              <Input
                type="date"
                defaultValue={tender.internal_completion_date ?? ''}
                onBlur={(e) => {
                  const v = e.target.value || null;
                  if (v !== tender.internal_completion_date) handleTenderFieldChange('internal_completion_date', v);
                }}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Estimated Value (ZAR)</Label>
              <Input
                type="number"
                step="0.01"
                defaultValue={tender.estimated_value ?? ''}
                onBlur={(e) => {
                  const v = e.target.value === '' ? null : Number(e.target.value);
                  if (v !== tender.estimated_value) handleTenderFieldChange('estimated_value', v);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Budget (ZAR)</Label>
              <Input
                type="number"
                step="0.01"
                defaultValue={tender.budget ?? ''}
                onBlur={(e) => {
                  const v = e.target.value === '' ? null : Number(e.target.value);
                  if (v !== tender.budget) handleTenderFieldChange('budget', v);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Duration (months)</Label>
              <Input
                type="number"
                defaultValue={tender.duration_months ?? ''}
                onBlur={(e) => {
                  const v = e.target.value === '' ? null : Number(e.target.value);
                  if (v !== tender.duration_months) handleTenderFieldChange('duration_months', v);
                }}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                value={tender.department ?? ''}
                onValueChange={(v) => handleTenderFieldChange('department', v || null)}
              >
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Resourcing">Resourcing</SelectItem>
                  <SelectItem value="Consulting">Consulting</SelectItem>
                  <SelectItem value="Technology">Technology</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={tender.category ?? ''}
                onValueChange={(v) => handleTenderFieldChange('category', v || null)}
              >
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EA">EA</SelectItem>
                  <SelectItem value="CyberSecurity">CyberSecurity</SelectItem>
                  <SelectItem value="ITSM">ITSM</SelectItem>
                  <SelectItem value="IT Support & Maintenance">IT Support & Maintenance</SelectItem>
                  <SelectItem value="Hardware Supply">Hardware Supply</SelectItem>
                  <SelectItem value="MimeCast">MimeCast</SelectItem>
                  <SelectItem value="Backup & Disaster Recovery">Backup & Disaster Recovery</SelectItem>
                  <SelectItem value="Oracle(ERP/Database)">Oracle(ERP/Database)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Submission Type</Label>
              <Select
                value={tender.submission_type ?? ''}
                onValueChange={(v) => handleTenderFieldChange('submission_type', v || null)}
              >
                <SelectTrigger><SelectValue placeholder="Select submission type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Physical">Physical</SelectItem>
                  <SelectItem value="Electronic">Electronic</SelectItem>
                  <SelectItem value="Electronic & Physical">Electronic & Physical</SelectItem>
                  <SelectItem value="Print & Physical">Print & Physical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rating</Label>
              <Input
                placeholder="e.g., A, B, C or 1-5"
                defaultValue={tender.rating ?? ''}
                onBlur={(e) => {
                  const v = e.target.value || null;
                  if (v !== tender.rating) handleTenderFieldChange('rating', v);
                }}
              />
            </div>
          </div>

          </fieldset>
          <div className="flex items-center gap-3 text-sm text-muted-foreground pt-2 border-t flex-wrap">
            <Clock className="h-4 w-4" />
            <span>
              Last updated: {format(new Date(tender.updated_at), 'PPP p')}
              {(tender as any).updated_by_email && (
                <>
                  {' by '}
                  <a
                    href={`mailto:${(tender as any).updated_by_email}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {(tender as any).updated_by_email}
                  </a>
                </>
              )}
            </span>
            {!canEdit && (
              <Badge variant="outline" className="ml-auto">View only</Badge>
            )}
            {isOverdue && <Badge variant="destructive">Overdue</Badge>}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-1">

        {/* Assignment */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Assigned Lead & Team</CardTitle>
            {isAdmin && (
              <ReassignLeadDialog
                tenderId={tender.id}
                currentLeadName={tender.assigned_lead_name}
                currentLeadEmail={tender.assigned_lead_email}
              />
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{tender.assigned_lead_name}</p>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <a href={`mailto:${tender.assigned_lead_email}`} className="hover:underline">
                    {tender.assigned_lead_email}
                  </a>
                </div>
                <Badge variant="secondary" className="mt-1 text-xs">Lead</Badge>
              </div>
            </div>

            {/* Team Members */}
            <TeamMembersSection tenderId={tender.id} canManage={isAdmin} />
          </CardContent>
        </Card>
      </div>

      {/* Briefing Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Briefing Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <fieldset disabled={!canEdit} className="space-y-4 disabled:opacity-90">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">Briefing Compulsory</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={tender.briefing_compulsory ?? false}
                  onCheckedChange={(checked) => handleTenderFieldChange('briefing_compulsory', checked)}
                />
                <Label className="text-sm">
                  {tender.briefing_compulsory ? 'Yes' : 'No'}
                </Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Briefing Date</Label>
              <Input
                type="date"
                value={tender.briefing_date ?? ''}
                onChange={(e) => handleTenderFieldChange('briefing_date', e.target.value || null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Briefing Time</Label>
              <Input
                type="time"
                value={tender.briefing_time ?? ''}
                onChange={(e) => handleTenderFieldChange('briefing_time', e.target.value || null)}
              />
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">Briefing Attended</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={tender.briefing_attended}
                  onCheckedChange={(checked) => handleTenderFieldChange('briefing_attended', checked)}
                />
                <Label className="text-sm">
                  {tender.briefing_attended ? 'Yes' : 'No'}
                </Label>
              </div>
            </div>
          </div>
          </fieldset>
        </CardContent>
      </Card>

      {/* Outcome Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Outcome
          </CardTitle>
          <CardDescription>Track the submission outcome and status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <fieldset disabled={!canEdit} className="space-y-4 disabled:opacity-90">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Outcome Status</Label>
              <Select 
                value={tender.outcome_status}
                onValueChange={(value) => handleTenderFieldChange('outcome_status', value as OutcomeStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">Submitted</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={tender.submitted}
                  onCheckedChange={(checked) => handleTenderFieldChange('submitted', checked)}
                />
                <Label className="text-sm">
                  {tender.submitted ? 'Yes' : 'No'}
                </Label>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">Successful</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={tender.successful ?? false}
                  onCheckedChange={(checked) => handleTenderFieldChange('successful', checked)}
                  disabled={!tender.submitted}
                />
                <Label className={cn("text-sm", !tender.submitted && "opacity-50")}>
                  {tender.successful === null ? 'Pending' : tender.successful ? 'Yes' : 'No'}
                </Label>
              </div>
            </div>
          </div>

          {!tender.submitted && (
            <div className="space-y-2">
              <Label>Reason for Non-Submission</Label>
              <Textarea
                placeholder="Explain why this tender was not submitted..."
                value={tender.non_submission_reason ?? ''}
                onChange={(e) => handleTenderFieldChange('non_submission_reason', e.target.value || null)}
                rows={3}
              />
            </div>
          )}
          </fieldset>
        </CardContent>
      </Card>

      {/* Requirements Checklist */}
      {requirements && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Requirements Checklist
              {allCompiled ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-warning" />
              )}
            </CardTitle>
            <CardDescription>
              Track compliance documents and their status. Upload attachments for each requirement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <fieldset disabled={!canEdit} className="space-y-6 disabled:opacity-90">
            {/* Quote */}
            <div className="p-4 rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium">Quote</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={requirements.quote_required}
                      onCheckedChange={(checked) => {
                        handleRequirementChange('quote_required', checked);
                        if (!checked) handleRequirementChange('quote_status', 'not_required');
                        else handleRequirementChange('quote_status', 'requested');
                      }}
                    />
                    <Label className="text-sm">{requirements.quote_required ? 'Required' : 'Not Required'}</Label>
                  </div>
                </div>
                {requirements.quote_required && (
                  <Select 
                    value={requirements.quote_status}
                    onValueChange={(value) => handleRequirementChange('quote_status', value as QuoteStatus)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="requested">Requested</SelectItem>
                      <SelectItem value="finalised">Finalised</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              {requirements.quote_required && (
                <AttachmentUpload tenderId={tender.id} requirementType="quote" label="Quote" />
              )}
            </div>

            {/* Reference Letters */}
            <div className="p-4 rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium">Reference Letters</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={requirements.reference_letters_required}
                      onCheckedChange={(checked) => {
                        handleRequirementChange('reference_letters_required', checked);
                        if (!checked) handleRequirementChange('reference_letters_status', 'not_required');
                        else handleRequirementChange('reference_letters_status', 'outstanding');
                      }}
                    />
                    <Label className="text-sm">{requirements.reference_letters_required ? 'Required' : 'Not Required'}</Label>
                  </div>
                </div>
                {requirements.reference_letters_required && (
                  <Select 
                    value={requirements.reference_letters_status}
                    onValueChange={(value) => handleRequirementChange('reference_letters_status', value as DocumentStatus)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outstanding">Outstanding</SelectItem>
                      <SelectItem value="compiled">Compiled</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              {requirements.reference_letters_required && (
                <AttachmentUpload tenderId={tender.id} requirementType="reference_letters" label="Reference Letters" />
              )}
            </div>

            {/* Accreditation */}
            <div className="p-4 rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium">Accreditation</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={requirements.accreditation_required}
                      onCheckedChange={(checked) => {
                        handleRequirementChange('accreditation_required', checked);
                        if (!checked) handleRequirementChange('accreditation_status', 'not_required');
                        else handleRequirementChange('accreditation_status', 'outstanding');
                      }}
                    />
                    <Label className="text-sm">{requirements.accreditation_required ? 'Required' : 'Not Required'}</Label>
                  </div>
                </div>
                {requirements.accreditation_required && (
                  <Select 
                    value={requirements.accreditation_status}
                    onValueChange={(value) => handleRequirementChange('accreditation_status', value as DocumentStatus)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outstanding">Outstanding</SelectItem>
                      <SelectItem value="compiled">Compiled</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              {requirements.accreditation_required && (
                <AttachmentUpload tenderId={tender.id} requirementType="accreditation" label="Accreditation" />
              )}
            </div>

            {/* CVs */}
            <div className="p-4 rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium">CVs</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={requirements.cvs_required}
                      onCheckedChange={(checked) => {
                        handleRequirementChange('cvs_required', checked);
                        if (!checked) handleRequirementChange('cvs_status', 'not_required');
                        else handleRequirementChange('cvs_status', 'outstanding');
                      }}
                    />
                    <Label className="text-sm">{requirements.cvs_required ? 'Required' : 'Not Required'}</Label>
                  </div>
                </div>
                {requirements.cvs_required && (
                  <Select 
                    value={requirements.cvs_status}
                    onValueChange={(value) => handleRequirementChange('cvs_status', value as DocumentStatus)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outstanding">Outstanding</SelectItem>
                      <SelectItem value="compiled">Compiled</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              {requirements.cvs_required && (
                <AttachmentUpload tenderId={tender.id} requirementType="cvs" label="CVs" />
              )}
            </div>

            {/* JV */}
            <div className="p-4 rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">JV (Joint Venture)</p>
                  <p className="text-sm text-muted-foreground">
                    {requirements.jv_required ? 'Required' : 'Not Required'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={requirements.jv_required}
                      onCheckedChange={(checked) => handleRequirementChange('jv_required', checked)}
                    />
                    <Label className="text-sm">Required</Label>
                  </div>
                  {requirements.jv_required && (
                    <Select 
                      value={requirements.jv_status}
                      onValueChange={(value) => handleRequirementChange('jv_status', value as DocumentStatus)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="outstanding">Outstanding</SelectItem>
                        <SelectItem value="compiled">Compiled</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              {requirements.jv_required && (
                <AttachmentUpload tenderId={tender.id} requirementType="jv" label="JV" />
              )}
            </div>

            {/* Project Plans */}
            <div className="p-4 rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium">Project Plans</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={requirements.project_plans_required}
                      onCheckedChange={(checked) => {
                        handleRequirementChange('project_plans_required', checked);
                        if (!checked) handleRequirementChange('project_plans_status', 'not_required');
                        else handleRequirementChange('project_plans_status', 'outstanding');
                      }}
                    />
                    <Label className="text-sm">{requirements.project_plans_required ? 'Required' : 'Not Required'}</Label>
                  </div>
                </div>
                {requirements.project_plans_required && (
                  <Select 
                    value={requirements.project_plans_status}
                    onValueChange={(value) => handleRequirementChange('project_plans_status', value as DocumentStatus)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outstanding">Outstanding</SelectItem>
                      <SelectItem value="compiled">Compiled</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              {requirements.project_plans_required && (
                <AttachmentUpload tenderId={tender.id} requirementType="project_plans" label="Project Plans" />
              )}
            </div>

            {/* Technical Response */}
            <div className="p-4 rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Technical Response</p>
                  <p className="text-sm text-muted-foreground">Always Required</p>
                </div>
                <Select 
                  value={requirements.technical_response_status}
                  onValueChange={(value) => handleRequirementChange('technical_response_status', value as TechnicalStatus)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="compiled">Compiled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <AttachmentUpload tenderId={tender.id} requirementType="technical_response" label="Technical Response" />
            </div>

            {/* Pricing Finalised */}
            <div className="p-4 rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Pricing Finalised</p>
                  <p className="text-sm text-muted-foreground">Always Required</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={requirements.pricing_finalised}
                    onCheckedChange={(checked) => handleRequirementChange('pricing_finalised', checked)}
                  />
                  <Label className="text-sm">
                    {requirements.pricing_finalised ? 'Yes' : 'No'}
                  </Label>
                </div>
              </div>
              <AttachmentUpload tenderId={tender.id} requirementType="pricing" label="Pricing" />
            </div>
            </fieldset>
          </CardContent>
        </Card>
      )}

      {/* Tender Document */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Tender Document
          </CardTitle>
          <CardDescription>Upload or view the original tender document</CardDescription>
        </CardHeader>
        <CardContent>
          <AttachmentUpload tenderId={tender.id} requirementType="tender_document" label="Tender Document" disabled={!canEdit} />
        </CardContent>
      </Card>

      {/* All Uploaded Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            All Uploaded Documents
          </CardTitle>
          <CardDescription>View all documents uploaded across all checklist items</CardDescription>
        </CardHeader>
        <CardContent>
          {(!allAttachments || allAttachments.length === 0) ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No documents uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {allAttachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-sm">{attachment.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {attachment.requirement_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        {attachment.file_size ? ` • ${(attachment.file_size / (1024 * 1024)).toFixed(1)} MB` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={async () => {
                        try {
                          const signedUrl = await viewAttachment.mutateAsync(attachment.file_path);
                          window.open(signedUrl, '_blank');
                        } catch {
                          toast({ variant: 'destructive', title: 'Failed to view file' });
                        }
                      }}
                      title="View"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={async () => {
                        try {
                          const blob = await downloadAttachmentMutation.mutateAsync(attachment.file_path);
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = attachment.file_name;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        } catch {
                          toast({ variant: 'destructive', title: 'Failed to download file' });
                        }
                      }}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
