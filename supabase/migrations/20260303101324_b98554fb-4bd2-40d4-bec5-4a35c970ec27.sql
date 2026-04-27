-- Update existing data: drafting -> new, review -> in_progress
UPDATE public.tenders SET status = 'new' WHERE status = 'drafting';
UPDATE public.tenders SET status = 'in_progress' WHERE status = 'review';