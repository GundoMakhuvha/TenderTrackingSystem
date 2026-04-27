import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Tender, 
  TenderRequirements, 
  TenderWithRequirements,
  TenderFormData,
  TenderStatus,
  QuoteStatus,
  DocumentStatus,
  TechnicalStatus 
} from '@/types/tender';

// Fetch all tenders with their requirements
export function useTenders() {
  return useQuery({
    queryKey: ['tenders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenders')
        .select(`
          *,
          tender_requirements (*)
        `)
        .order('submission_deadline', { ascending: true });

      if (error) throw error;
      
      return (data as unknown as TenderWithRequirements[]) ?? [];
    },
  });
}

// Fetch a single tender
export function useTender(id: string | undefined) {
  return useQuery({
    queryKey: ['tender', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('tenders')
        .select(`
          *,
          tender_requirements (*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Look up updater email if updated_by is set
      let updated_by_email: string | null = null;
      const updatedById = (data as any).updated_by as string | null | undefined;
      if (updatedById) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', updatedById)
          .maybeSingle();
        updated_by_email = profile?.email ?? null;
        (data as any).updated_by_full_name = profile?.full_name ?? null;
      }
      (data as any).updated_by_email = updated_by_email;

      return data as unknown as TenderWithRequirements | null;
    },
    enabled: !!id,
  });
}

// Create a new tender
export function useCreateTender() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: TenderFormData) => {
      // Create tender
      const { data: tender, error: tenderError } = await supabase
        .from('tenders')
        .insert({
          tender_reference: formData.tender_reference,
          title: formData.title,
          client_name: formData.client_name,
          submission_deadline: formData.submission_deadline,
          assigned_lead_name: formData.assigned_lead_name,
          assigned_lead_email: formData.assigned_lead_email,
          status: (formData.status || 'new') as TenderStatus,
          estimated_value: formData.estimated_value,
          briefing_date: formData.briefing_date,
          briefing_time: formData.briefing_time,
          briefing_attended: formData.briefing_attended,
          duration_months: formData.duration_months,
          budget: formData.budget,
          rating: formData.rating,
          outcome_status: formData.outcome_status,
          submitted: formData.submitted,
          successful: formData.successful,
          non_submission_reason: formData.non_submission_reason,
          department: formData.department,
          category: formData.category,
          assignment: formData.assignment,
          submission_type: formData.submission_type,
          internal_completion_date: formData.internal_completion_date,
        })
        .select()
        .single();

      if (tenderError) throw tenderError;

      // Create requirements checklist
      const { error: reqError } = await supabase
        .from('tender_requirements')
        .insert({
          tender_id: tender.id,
          quote_required: formData.quote_required,
          quote_status: formData.quote_required ? 'requested' : 'not_required',
          reference_letters_required: formData.reference_letters_required,
          reference_letters_status: formData.reference_letters_required ? 'outstanding' : 'not_required',
          accreditation_required: formData.accreditation_required,
          accreditation_status: formData.accreditation_required ? 'outstanding' : 'not_required',
          cvs_required: formData.cvs_required,
          cvs_status: formData.cvs_required ? 'outstanding' : 'not_required',
          technical_response_status: 'not_started',
          pricing_finalised: false,
        });

      if (reqError) throw reqError;

      return tender;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenders'] });
    },
  });
}

// Update tender status
export function useUpdateTenderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TenderStatus }) => {
      const { error } = await supabase
        .from('tenders')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenders'] });
    },
  });
}

// Update tender requirements
export function useUpdateTenderRequirements() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tenderId,
      updates,
    }: {
      tenderId: string;
      updates: Partial<{
        quote_status: QuoteStatus;
        reference_letters_status: DocumentStatus;
        accreditation_status: DocumentStatus;
        cvs_status: DocumentStatus;
        technical_response_status: TechnicalStatus;
        pricing_finalised: boolean;
      }>;
    }) => {
      const { error } = await supabase
        .from('tender_requirements')
        .update(updates)
        .eq('tender_id', tenderId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenders'] });
      queryClient.invalidateQueries({ queryKey: ['tender', variables.tenderId] });
    },
  });
}

// Update tender details
export function useUpdateTender() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: Partial<Omit<Tender, 'id' | 'created_at' | 'updated_at'>> 
    }) => {
      const { error } = await supabase
        .from('tenders')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenders'] });
      queryClient.invalidateQueries({ queryKey: ['tender', variables.id] });
    },
  });
}

// Delete tender
export function useDeleteTender() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tenders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenders'] });
    },
  });
}

// Bulk create tenders
export function useBulkCreateTenders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tenders: TenderFormData[]) => {
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const formData of tenders) {
        try {
          // Create tender
          const { data: tender, error: tenderError } = await supabase
            .from('tenders')
            .insert({
              tender_reference: formData.tender_reference,
              title: formData.title,
              client_name: formData.client_name,
              submission_deadline: formData.submission_deadline,
              assigned_lead_name: formData.assigned_lead_name,
              assigned_lead_email: formData.assigned_lead_email,
              status: (formData.status || 'new') as TenderStatus,
              estimated_value: formData.estimated_value,
              briefing_date: formData.briefing_date,
              briefing_time: formData.briefing_time,
              briefing_attended: formData.briefing_attended,
              duration_months: formData.duration_months,
              budget: formData.budget,
              rating: formData.rating,
              outcome_status: formData.outcome_status,
              submitted: formData.submitted,
              successful: formData.successful,
              non_submission_reason: formData.non_submission_reason,
              department: formData.department,
              category: formData.category,
              assignment: formData.assignment,
              submission_type: formData.submission_type,
              internal_completion_date: formData.internal_completion_date,
            })
            .select()
            .single();

          if (tenderError) {
            results.failed++;
            results.errors.push(`${formData.tender_reference}: ${tenderError.message}`);
            continue;
          }

          // Create requirements
          const { error: reqError } = await supabase
            .from('tender_requirements')
            .insert({
              tender_id: tender.id,
              quote_required: formData.quote_required,
              quote_status: formData.quote_required ? 'requested' : 'not_required',
              reference_letters_required: formData.reference_letters_required,
              reference_letters_status: formData.reference_letters_required ? 'outstanding' : 'not_required',
              accreditation_required: formData.accreditation_required,
              accreditation_status: formData.accreditation_required ? 'outstanding' : 'not_required',
              cvs_required: formData.cvs_required,
              cvs_status: formData.cvs_required ? 'outstanding' : 'not_required',
              technical_response_status: 'not_started',
              pricing_finalised: false,
            });

          if (reqError) {
            results.failed++;
            results.errors.push(`${formData.tender_reference}: Failed to create requirements`);
            continue;
          }

          results.success++;
        } catch (e) {
          results.failed++;
          results.errors.push(`${formData.tender_reference}: Unknown error`);
        }
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenders'] });
    },
  });
}
