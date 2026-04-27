-- Add new enum values to tender_status
ALTER TYPE public.tender_status ADD VALUE IF NOT EXISTS 'new';
ALTER TYPE public.tender_status ADD VALUE IF NOT EXISTS 'go_ahead';
ALTER TYPE public.tender_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE public.tender_status ADD VALUE IF NOT EXISTS 'completed';