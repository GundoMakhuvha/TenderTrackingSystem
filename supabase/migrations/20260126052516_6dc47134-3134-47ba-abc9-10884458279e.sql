-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'bids_team', 'assigned_user');

-- Create enum for tender status
CREATE TYPE public.tender_status AS ENUM ('drafting', 'review', 'submitted');

-- Create profiles table for user data
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create user_roles table (roles stored separately for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (user_id, role)
);

-- Create tenders table
CREATE TABLE public.tenders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_reference TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    client_name TEXT NOT NULL,
    submission_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    assigned_lead_name TEXT NOT NULL,
    assigned_lead_email TEXT NOT NULL,
    status tender_status NOT NULL DEFAULT 'drafting',
    estimated_value NUMERIC,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create tender_requirements table
CREATE TABLE public.tender_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID REFERENCES public.tenders(id) ON DELETE CASCADE NOT NULL,
    -- Quote requirement
    quote_required BOOLEAN NOT NULL DEFAULT FALSE,
    quote_status TEXT NOT NULL DEFAULT 'not_required' CHECK (quote_status IN ('not_required', 'requested', 'finalised')),
    -- Reference Letters requirement
    reference_letters_required BOOLEAN NOT NULL DEFAULT FALSE,
    reference_letters_status TEXT NOT NULL DEFAULT 'not_required' CHECK (reference_letters_status IN ('not_required', 'outstanding', 'compiled')),
    -- Accreditation requirement
    accreditation_required BOOLEAN NOT NULL DEFAULT FALSE,
    accreditation_status TEXT NOT NULL DEFAULT 'not_required' CHECK (accreditation_status IN ('not_required', 'outstanding', 'compiled')),
    -- CVs requirement
    cvs_required BOOLEAN NOT NULL DEFAULT FALSE,
    cvs_status TEXT NOT NULL DEFAULT 'not_required' CHECK (cvs_status IN ('not_required', 'outstanding', 'compiled')),
    -- Technical Response (always required)
    technical_response_status TEXT NOT NULL DEFAULT 'not_started' CHECK (technical_response_status IN ('not_started', 'in_progress', 'compiled')),
    -- Pricing Finalised
    pricing_finalised BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(tender_id)
);

-- Create function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = _role
    )
$$;

-- Create function to check if user is admin or bids team
CREATE OR REPLACE FUNCTION public.is_admin_or_bids_team(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role IN ('admin', 'bids_team')
    )
$$;

-- Create function to check if user can manage a tender
CREATE OR REPLACE FUNCTION public.can_manage_tender(_user_id UUID, _tender_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        public.is_admin_or_bids_team(_user_id)
        OR EXISTS (
            SELECT 1
            FROM public.tenders t
            JOIN public.profiles p ON p.id = _user_id
            WHERE t.id = _tender_id
            AND t.assigned_lead_email = p.email
        )
$$;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_tenders_updated_at
    BEFORE UPDATE ON public.tenders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_tender_requirements_updated_at
    BEFORE UPDATE ON public.tender_requirements
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    
    -- Assign default role as assigned_user
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'assigned_user');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tender_requirements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Admins and bids team can view all profiles"
    ON public.profiles FOR SELECT
    USING (public.is_admin_or_bids_team(auth.uid()));

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
    ON public.user_roles FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
    ON public.user_roles FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for tenders
CREATE POLICY "Admins and bids team can view all tenders"
    ON public.tenders FOR SELECT
    USING (public.is_admin_or_bids_team(auth.uid()));

CREATE POLICY "Assigned users can view their tenders"
    ON public.tenders FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.email = assigned_lead_email
        )
    );

CREATE POLICY "Admins and bids team can create tenders"
    ON public.tenders FOR INSERT
    WITH CHECK (public.is_admin_or_bids_team(auth.uid()));

CREATE POLICY "Admins and bids team can update any tender"
    ON public.tenders FOR UPDATE
    USING (public.is_admin_or_bids_team(auth.uid()));

CREATE POLICY "Assigned users can update their tenders"
    ON public.tenders FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.email = assigned_lead_email
        )
    );

CREATE POLICY "Admins and bids team can delete tenders"
    ON public.tenders FOR DELETE
    USING (public.is_admin_or_bids_team(auth.uid()));

-- RLS Policies for tender_requirements
CREATE POLICY "Can view requirements if can manage tender"
    ON public.tender_requirements FOR SELECT
    USING (public.can_manage_tender(auth.uid(), tender_id));

CREATE POLICY "Admins and bids team can create requirements"
    ON public.tender_requirements FOR INSERT
    WITH CHECK (public.is_admin_or_bids_team(auth.uid()));

CREATE POLICY "Can update requirements if can manage tender"
    ON public.tender_requirements FOR UPDATE
    USING (public.can_manage_tender(auth.uid(), tender_id));

CREATE POLICY "Admins and bids team can delete requirements"
    ON public.tender_requirements FOR DELETE
    USING (public.is_admin_or_bids_team(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_tenders_status ON public.tenders(status);
CREATE INDEX idx_tenders_deadline ON public.tenders(submission_deadline);
CREATE INDEX idx_tenders_assigned_email ON public.tenders(assigned_lead_email);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_tender_requirements_tender_id ON public.tender_requirements(tender_id);