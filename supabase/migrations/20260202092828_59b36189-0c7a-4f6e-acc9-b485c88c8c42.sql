-- Add new fields to tenders table
ALTER TABLE public.tenders
ADD COLUMN briefing_date DATE,
ADD COLUMN briefing_attended BOOLEAN DEFAULT false,
ADD COLUMN duration_months INTEGER,
ADD COLUMN budget NUMERIC,
ADD COLUMN rating TEXT,
ADD COLUMN outcome_status TEXT DEFAULT 'not_started' CHECK (outcome_status IN ('completed', 'in_progress', 'not_started')),
ADD COLUMN submitted BOOLEAN DEFAULT false,
ADD COLUMN successful BOOLEAN,
ADD COLUMN non_submission_reason TEXT;

-- Create tender_attachments table for checklist document uploads
CREATE TABLE public.tender_attachments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
    requirement_type TEXT NOT NULL CHECK (requirement_type IN ('quote', 'reference_letters', 'accreditation', 'cvs', 'technical_response', 'pricing')),
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on attachments
ALTER TABLE public.tender_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for attachments - same as tender access
CREATE POLICY "Can view attachments if can manage tender"
ON public.tender_attachments
FOR SELECT
USING (public.can_manage_tender(auth.uid(), tender_id));

CREATE POLICY "Can upload attachments if can manage tender"
ON public.tender_attachments
FOR INSERT
WITH CHECK (public.can_manage_tender(auth.uid(), tender_id));

CREATE POLICY "Admins and bids team can delete attachments"
ON public.tender_attachments
FOR DELETE
USING (public.is_admin_or_bids_team(auth.uid()));

-- Create storage bucket for tender attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tender-attachments', 'tender-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for tender attachments
CREATE POLICY "Authenticated users can upload tender attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tender-attachments');

CREATE POLICY "Authenticated users can view tender attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'tender-attachments');

CREATE POLICY "Authenticated users can delete tender attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'tender-attachments');