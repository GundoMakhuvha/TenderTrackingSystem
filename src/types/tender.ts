export type TenderStatus = 'new' | 'go_ahead' | 'in_progress' | 'completed' | 'submitted' | 'cancelled' | 'rejected';
export type OutcomeStatus = 'completed' | 'in_progress' | 'not_started';

export type QuoteStatus = 'not_required' | 'requested' | 'finalised';
export type DocumentStatus = 'not_required' | 'outstanding' | 'compiled';
export type TechnicalStatus = 'not_started' | 'in_progress' | 'compiled';

export type TenderDepartment = 'Resourcing' | 'Consulting' | 'Technology';

export interface Tender {
  id: string;
  tender_reference: string;
  title: string;
  client_name: string;
  submission_deadline: string;
  assigned_lead_name: string;
  assigned_lead_email: string;
  status: TenderStatus;
  estimated_value: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  briefing_date: string | null;
  briefing_time: string | null;
  briefing_attended: boolean;
  briefing_compulsory: boolean;
  duration_months: number | null;
  budget: number | null;
  rating: string | null;
  outcome_status: OutcomeStatus;
  submitted: boolean;
  successful: boolean | null;
  non_submission_reason: string | null;
  department: TenderDepartment | null;
  category: string | null;
  assignment: string | null;
  submission_type: string | null;
  internal_completion_date: string | null;
}

export interface TenderRequirements {
  id: string;
  tender_id: string;
  quote_required: boolean;
  quote_status: QuoteStatus;
  reference_letters_required: boolean;
  reference_letters_status: DocumentStatus;
  accreditation_required: boolean;
  accreditation_status: DocumentStatus;
  cvs_required: boolean;
  cvs_status: DocumentStatus;
  jv_required: boolean;
  jv_status: DocumentStatus;
  project_plans_required: boolean;
  project_plans_status: DocumentStatus;
  technical_response_status: TechnicalStatus;
  pricing_finalised: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenderAttachment {
  id: string;
  tender_id: string;
  requirement_type: 'quote' | 'reference_letters' | 'accreditation' | 'cvs' | 'jv' | 'project_plans' | 'technical_response' | 'pricing' | 'tender_document';
  file_name: string;
  file_path: string;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface TenderWithRequirements extends Tender {
  tender_requirements: TenderRequirements | null;
}

export interface TenderFormData {
  tender_reference: string;
  title: string;
  client_name: string;
  submission_deadline: string;
  assigned_lead_name: string;
  assigned_lead_email: string;
  status: TenderStatus;
  estimated_value: number | null;
  quote_required: boolean;
  reference_letters_required: boolean;
  accreditation_required: boolean;
  cvs_required: boolean;
  // New fields
  briefing_date: string | null;
  briefing_time: string | null;
  briefing_attended: boolean;
  briefing_compulsory: boolean;
  duration_months: number | null;
  budget: number | null;
  rating: string | null;
  outcome_status: OutcomeStatus;
  submitted: boolean;
  successful: boolean | null;
  non_submission_reason: string | null;
  // Additional fields
  department: TenderDepartment | null;
  category: string | null;
  assignment: string | null;
  submission_type: string | null;
  internal_completion_date: string | null;
}

// Helper to check if all required documents are compiled
export function areAllDocumentsCompiled(requirements: TenderRequirements | null): boolean {
  if (!requirements) return false;

  const quoteComplete = !requirements.quote_required || requirements.quote_status === 'finalised';
  const refsComplete = !requirements.reference_letters_required || requirements.reference_letters_status === 'compiled';
  const accredComplete = !requirements.accreditation_required || requirements.accreditation_status === 'compiled';
  const cvsComplete = !requirements.cvs_required || requirements.cvs_status === 'compiled';
  const jvComplete = !requirements.jv_required || requirements.jv_status === 'compiled';
  const plansComplete = !requirements.project_plans_required || requirements.project_plans_status === 'compiled';
  const techComplete = requirements.technical_response_status === 'compiled';
  const pricingComplete = requirements.pricing_finalised;

  return quoteComplete && refsComplete && accredComplete && cvsComplete && jvComplete && plansComplete && techComplete && pricingComplete;
}

// Helper to check if tender is overdue
export function isTenderOverdue(tender: Tender): boolean {
  return new Date(tender.submission_deadline) < new Date() && tender.status !== 'submitted' && tender.status !== 'completed' && tender.status !== 'cancelled' && tender.status !== 'rejected';
}

export const tenderStatusLabels: Record<TenderStatus, string> = {
  new: 'New',
  go_ahead: 'Approved',
  in_progress: 'In-Progress',
  completed: 'Completed',
  submitted: 'Submitted',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
};
