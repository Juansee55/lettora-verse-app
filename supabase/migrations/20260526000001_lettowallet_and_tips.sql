-- Add tip settings to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tip_paypal_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tip_stripe_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tips_enabled BOOLEAN DEFAULT FALSE;

-- Create wallet table
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    balance DECIMAL(12, 2) DEFAULT 0.00,
    currency TEXT DEFAULT 'LettoPays',
    cbu_cvu TEXT UNIQUE,
    alias TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- Create wallet transactions table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    receiver_wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    amount DECIMAL(12, 2) NOT NULL,
    description TEXT,
    transaction_type TEXT NOT NULL, -- 'transfer', 'deposit', 'withdrawal', 'tip'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for wallets
CREATE POLICY "Users can view their own wallet" ON public.wallets
    FOR SELECT USING (auth.uid() = user_id);

-- Policies for transactions
CREATE POLICY "Users can view their own transactions" ON public.wallet_transactions
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM public.wallets WHERE id = sender_wallet_id
            OR id = receiver_wallet_id
        )
    );

-- Function to handle transfers
CREATE OR REPLACE FUNCTION public.transfer_lettopays(
    p_sender_id UUID,
    p_receiver_id UUID,
    p_amount DECIMAL,
    p_description TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_sender_wallet_id UUID;
    v_receiver_wallet_id UUID;
BEGIN
    -- Get wallet IDs
    SELECT id INTO v_sender_wallet_id FROM public.wallets WHERE user_id = p_sender_id;
    SELECT id INTO v_receiver_wallet_id FROM public.wallets WHERE user_id = p_receiver_id;

    IF v_sender_wallet_id IS NULL OR v_receiver_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Wallet not found';
    END IF;

    -- Check balance
    IF (SELECT balance FROM public.wallets WHERE id = v_sender_wallet_id) < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- Update balances
    UPDATE public.wallets SET balance = balance - p_amount, updated_at = now() WHERE id = v_sender_wallet_id;
    UPDATE public.wallets SET balance = balance + p_amount, updated_at = now() WHERE id = v_receiver_wallet_id;

    -- Record transaction
    INSERT INTO public.wallet_transactions (sender_wallet_id, receiver_wallet_id, amount, description, transaction_type)
    VALUES (v_sender_wallet_id, v_receiver_wallet_id, p_amount, p_description, 'transfer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
