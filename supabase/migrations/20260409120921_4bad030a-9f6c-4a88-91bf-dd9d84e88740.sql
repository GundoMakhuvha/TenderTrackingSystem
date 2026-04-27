-- Add 'rejected' to the tender_status enum
ALTER TYPE public.tender_status ADD VALUE IF NOT EXISTS 'rejected';

-- Add internal_completion_date and briefing_time to tenders
ALTER TABLE public.tenders ADD COLUMN IF NOT EXISTS internal_completion_date date;
ALTER TABLE public.tenders ADD COLUMN IF NOT EXISTS briefing_time text;

-- Add project_plans to tender_requirements
ALTER TABLE public.tender_requirements ADD COLUMN IF NOT EXISTS project_plans_required boolean NOT NULL DEFAULT false;
ALTER TABLE public.tender_requirements ADD COLUMN IF NOT EXISTS project_plans_status text NOT NULL DEFAULT 'not_required';