-- Add new fields to tenders table
ALTER TABLE public.tenders
ADD COLUMN department text NULL,
ADD COLUMN category text NULL,
ADD COLUMN assignment text NULL;

-- Add check constraint for department values
ALTER TABLE public.tenders
ADD CONSTRAINT tenders_department_check CHECK (department IS NULL OR department IN ('Resourcing', 'Consulting', 'Technology'));