
-- Create verification type enum
CREATE TYPE public.verification_type AS ENUM ('official', 'premium', 'creator');
CREATE TYPE public.verification_status AS ENUM ('active', 'expired', 'pending', 'cancelled');

-- Create user_verifications table
CREATE TABLE public.user_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  verification_type public.verification_type NOT NULL DEFAULT 'premium',
  status public.verification_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_verifications ENABLE ROW LEVEL SECURITY;

-- Everyone can view verifications
CREATE POLICY "Anyone can view verifications"
ON public.user_verifications FOR SELECT USING (true);

-- Users can insert their own
CREATE POLICY "Users can request verification"
ON public.user_verifications FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own
CREATE POLICY "Users can update own verification"
ON public.user_verifications FOR UPDATE
USING (auth.uid() = user_id);
