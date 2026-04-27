
-- Add briefing_compulsory to tenders
ALTER TABLE public.tenders ADD COLUMN IF NOT EXISTS briefing_compulsory boolean DEFAULT false;

-- Add JV fields to tender_requirements
ALTER TABLE public.tender_requirements ADD COLUMN IF NOT EXISTS jv_required boolean NOT NULL DEFAULT false;
ALTER TABLE public.tender_requirements ADD COLUMN IF NOT EXISTS jv_status text NOT NULL DEFAULT 'not_required';
