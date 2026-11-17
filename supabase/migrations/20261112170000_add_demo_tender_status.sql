-- The app offers a "Demo" status but the enum never had it, so selecting it failed.
ALTER TYPE public.tender_status ADD VALUE IF NOT EXISTS 'demo';
