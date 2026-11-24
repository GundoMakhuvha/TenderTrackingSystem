import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateTender } from '@/hooks/useTenders';
import { useUploadAttachment } from '@/hooks/useAttachments';
import { TenderFormData } from '@/types/tender';
import { useProfiles } from '@/hooks/useProfiles';
import { addTeamMembers } from '@/hooks/useTeamMembers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Mail, Save, User, UserPlus, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TenderForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createTender = useCreateTender();
  const { data: profiles } = useProfiles();
  const uploadAttachment = useUploadAttachment();
  const [tenderDocFile, setTenderDocFile] = useState<File | null>(null);
  const [leadId, setLeadId] = useState<string>('');
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [pendingMember, setPendingMember] = useState<string>('');
  const MAX_TEAM_MEMBERS = 5;
  const people = (profiles ?? []).filter((p) => p.id && p.email);
  const nameOf = (p: { full_name: string | null; email: string }) => p.full_name || p.email;

  const [formData, setFormData] = useState<TenderFormData>({
    tender_reference: '',
    title: '',
    client_name: '',
    submission_deadline: '',
    assigned_lead_name: '',
    assigned_lead_email: '',
    status: 'new',
    estimated_value: null,
    quote_required: false,
    reference_letters_required: false,
    accreditation_required: false,
    cvs_required: false,
    briefing_date: null,
    briefing_time: null,
    briefing_attended: false,
    briefing_compulsory: false,
    duration_months: null,
    budget: null,
    rating: null,
    outcome_status: 'not_started',
    submitted: false,
    successful: null,
    non_submission_reason: null,
    department: null,
    category: null,
    assignment: null,
    submission_type: null,
    internal_completion_date: null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const tender = await createTender.mutateAsync(formData);

      // Save the team straight away: everyone gets the new tender email,
      // and the lead's email lists the whole team.
      if (teamIds.length > 0) {
        try {
          await addTeamMembers(tender.id, teamIds);
        } catch {
          toast({
            variant: 'destructive',
            title: 'Team not saved',
            description: 'The tender was created but the team members could not be added. Add them from the tender page.',
          });
        }
      }
      
      // Upload tender document if selected
      if (tenderDocFile) {
        try {
          await uploadAttachment.mutateAsync({
            tenderId: tender.id,
            requirementType: 'tender_document',
            file: tenderDocFile,
          });
        } catch {
          // Don't block navigation if doc upload fails
          toast({
            variant: 'destructive',
            title: 'Warning',
            description: 'Tender created but document upload failed. You can upload it later from the detail page.',
          });
        }
      }
      
      toast({
        title: 'Tender created',
        description:
          leadId || teamIds.length
            ? 'The lead and team will get an email with the tender details and dates.'
            : 'You can now add its briefing and deadline to Outlook from this page.',
      });
      navigate(`/tenders/${tender.id}`);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create tender',
      });
    }
  };

  const updateField = <K extends keyof TenderFormData>(
    field: K,
    value: TenderFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/tenders">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Tender</h1>
          <p className="text-muted-foreground mt-1">
            Create a new tender record
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Enter the core tender details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tender_reference">Tender Reference *</Label>
                <Input
                  id="tender_reference"
                  placeholder="Example: TIPP-2026-001"
                  value={formData.tender_reference}
                  onChange={(e) => updateField('tender_reference', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="internal_completion_date">Internal Completion Date</Label>
                <Input
                  id="internal_completion_date"
                  type="date"
                  value={formData.internal_completion_date ?? ''}
                  onChange={(e) => updateField('internal_completion_date', e.target.value || null)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="submission_deadline">Submission Deadline *</Label>
                <Input
                  id="submission_deadline"
                  type="datetime-local"
                  value={formData.submission_deadline}
                  onChange={(e) => updateField('submission_deadline', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Tender Title *</Label>
              <Input
                id="title"
                placeholder="Example: IT Infrastructure Support Services"
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="client_name">Client Name *</Label>
                <Input
                  id="client_name"
                  placeholder="Example: Tipp Focus"
                  value={formData.client_name}
                  onChange={(e) => updateField('client_name', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimated_value">Estimated Value (ZAR)</Label>
                <Input
                  id="estimated_value"
                  type="number"
                  placeholder="Example: 50000"
                  value={formData.estimated_value ?? ''}
                  onChange={(e) => updateField('estimated_value', e.target.value ? Number(e.target.value) : null)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="budget">Budget (ZAR)</Label>
                <Input
                  id="budget"
                  type="number"
                  placeholder="Example: 100000"
                  value={formData.budget ?? ''}
                  onChange={(e) => updateField('budget', e.target.value ? Number(e.target.value) : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration_months">Duration (Months)</Label>
                <Input
                  id="duration_months"
                  type="number"
                  placeholder="Example: 12"
                  value={formData.duration_months ?? ''}
                  onChange={(e) => updateField('duration_months', e.target.value ? Number(e.target.value) : null)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select
                  value={formData.department ?? ''}
                  onValueChange={(value: any) => updateField('department', value || null)}
                >
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Resourcing">Resourcing</SelectItem>
                    <SelectItem value="Consulting">Consulting</SelectItem>
                    <SelectItem value="Technology">Technology</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category ?? ''}
                  onValueChange={(value: any) => updateField('category', value || null)}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EA">EA</SelectItem>
                    <SelectItem value="CyberSecurity">CyberSecurity</SelectItem>
                    <SelectItem value="ITSM">ITSM</SelectItem>
                    <SelectItem value="IT Support & Maintenance">IT Support & Maintenance</SelectItem>
                    <SelectItem value="Hardware Supply">Hardware Supply</SelectItem>
                    <SelectItem value="MimeCast">MimeCast</SelectItem>
                    <SelectItem value="Backup & Disaster Recovery">Backup & Disaster Recovery</SelectItem>
                    <SelectItem value="Oracle(ERP/Database)">Oracle(ERP/Database)</SelectItem>
                    <SelectItem value="Digitization">Digitization</SelectItem>
                    <SelectItem value="Records Management">Records Management</SelectItem>
                    <SelectItem value="MS Dynamics">MS Dynamics</SelectItem>
                    <SelectItem value="Recruitment">Recruitment</SelectItem>
                    <SelectItem value="BPM">BPM</SelectItem>
                    <SelectItem value="Enterprise Architecture">Enterprise Architecture</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="submission_type">Submission Type</Label>
                <Select
                  value={formData.submission_type ?? ''}
                  onValueChange={(value: any) => updateField('submission_type', value || null)}
                >
                  <SelectTrigger id="submission_type">
                    <SelectValue placeholder="Select submission type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Physical">Physical</SelectItem>
                    <SelectItem value="Electronic">Electronic</SelectItem>
                    <SelectItem value="Electronic & Physical">Electronic & Physical</SelectItem>
                    <SelectItem value="Print & Physical">Print & Physical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rating">Rating</Label>
                <Input
                  id="rating"
                  placeholder="Example: A, B, C or 1-5"
                  value={formData.rating ?? ''}
                  onChange={(e) => updateField('rating', e.target.value || null)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignment">Assignment</Label>
              <Select
                value={formData.assignment ?? ''}
                onValueChange={(value: any) => updateField('assignment', value || null)}
              >
                <SelectTrigger id="assignment">
                  <SelectValue placeholder="Select assignment" />
                </SelectTrigger>
                <SelectContent>
                  {(profiles ?? []).filter(p => p.id && (p.full_name || p.email)).map(p => (
                    <SelectItem key={p.id} value={p.full_name || p.email}>
                      {p.full_name || p.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tender Team */}
        <Card>
          <CardHeader>
            <CardTitle>Tender Team</CardTitle>
            <CardDescription>
              The lead and each team member get an email with the tender details and an Outlook calendar file with its dates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="tender_lead">Tender lead</Label>
              <Select
                value={leadId}
                onValueChange={(id) => {
                  const p = people.find((x) => x.id === id);
                  setLeadId(id);
                  setTeamIds((prev) => prev.filter((t) => t !== id));
                  setFormData((prev) => ({
                    ...prev,
                    assigned_lead_name: p ? nameOf(p) : '',
                    assigned_lead_email: p?.email ?? '',
                  }));
                }}
              >
                <SelectTrigger id="tender_lead">
                  <SelectValue placeholder="Select the tender lead" />
                </SelectTrigger>
                <SelectContent>
                  {people.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {nameOf(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                Team members <span className="text-muted-foreground font-normal">({teamIds.length}/{MAX_TEAM_MEMBERS})</span>
              </Label>
              {teamIds.map((id) => {
                const p = people.find((x) => x.id === id);
                if (!p) return null;
                return (
                  <div key={id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{nameOf(p)}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                          <Mail className="h-3 w-3" />
                          {p.email}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={`Remove ${nameOf(p)}`}
                      onClick={() => setTeamIds((prev) => prev.filter((t) => t !== id))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
              {teamIds.length < MAX_TEAM_MEMBERS && (
                <div className="flex items-center gap-2">
                  <Select value={pendingMember} onValueChange={setPendingMember}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Add a team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {people
                        .filter((p) => p.id !== leadId && !teamIds.includes(p.id))
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {nameOf(p)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!pendingMember}
                    onClick={() => {
                      setTeamIds((prev) => [...prev, pendingMember]);
                      setPendingMember('');
                    }}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                </div>
              )}
              {people.length === 0 && (
                <p className="text-xs text-muted-foreground">Only people with a Tender Tracker account can be selected.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Briefing Information */}
        <Card>
          <CardHeader>
            <CardTitle>Briefing Information</CardTitle>
            <CardDescription>Details about the tender briefing session</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">Briefing Compulsory</p>
                <p className="text-sm text-muted-foreground">Is attending the briefing mandatory?</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="briefing_compulsory"
                  checked={formData.briefing_compulsory}
                  onCheckedChange={(checked) => updateField('briefing_compulsory', checked)}
                />
                <Label htmlFor="briefing_compulsory" className="text-sm">
                  {formData.briefing_compulsory ? 'Yes' : 'No'}
                </Label>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="briefing_date">Briefing Date</Label>
                <Input
                  id="briefing_date"
                  type="date"
                  value={formData.briefing_date ?? ''}
                  onChange={(e) => updateField('briefing_date', e.target.value || null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="briefing_time">Briefing Time</Label>
                <Input
                  id="briefing_time"
                  type="time"
                  value={formData.briefing_time ?? ''}
                  onChange={(e) => updateField('briefing_time', e.target.value || null)}
                />
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <Switch
                  id="briefing_attended"
                  checked={formData.briefing_attended}
                  onCheckedChange={(checked) => updateField('briefing_attended', checked)}
                />
                <Label htmlFor="briefing_attended" className="cursor-pointer">
                  Briefing Attended
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tender Document Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Tender Document</CardTitle>
            <CardDescription>Upload the original tender document (PDF/DOC)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="tender_document">Tender Document</Label>
              <Input
                id="tender_document"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setTenderDocFile(file);
                  }
                }}
              />
              {tenderDocFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {tenderDocFile.name} ({(tenderDocFile.size / (1024 * 1024)).toFixed(1)} MB)
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link to="/tenders">Cancel</Link>
          </Button>
          <Button type="submit" disabled={createTender.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {createTender.isPending ? 'Creating...' : 'Create Tender'}
          </Button>
        </div>
      </form>
    </div>
  );
}
