-- Add receipt_url to transactions
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS receipt_data JSONB;

-- Function to search user by CBU or Alias
CREATE OR REPLACE FUNCTION public.find_wallet_by_identifier(p_identifier TEXT)
RETURNS TABLE (
    wallet_id UUID,
    user_id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    alias TEXT,
    cbu_cvu TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id as wallet_id,
        w.user_id,
        p.username,
        p.display_name,
        p.avatar_url,
        w.alias,
        w.cbu_cvu
    FROM public.wallets w
    JOIN public.profiles p ON w.user_id = p.id
    WHERE w.alias = p_identifier OR w.cbu_cvu = p_identifier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin function to adjust balance
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(
    p_target_user_id UUID,
    p_amount DECIMAL,
    p_description TEXT,
    p_admin_user_id UUID
) RETURNS VOID AS $$
DECLARE
    v_wallet_id UUID;
BEGIN
    -- Check if caller is admin
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_admin_user_id AND role = 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Admin only';
    END IF;

    -- Get or create wallet
    SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = p_target_user_id;
    
    IF v_wallet_id IS NULL THEN
        INSERT INTO public.wallets (user_id, balance) 
        VALUES (p_target_user_id, p_amount)
        RETURNING id INTO v_wallet_id;
    ELSE
        UPDATE public.wallets SET balance = balance + p_amount, updated_at = now() WHERE id = v_wallet_id;
    END IF;

    -- Record transaction
    INSERT INTO public.wallet_transactions (receiver_wallet_id, amount, description, transaction_type, receipt_data)
    VALUES (
        v_wallet_id, 
        ABS(p_amount), 
        p_description, 
        CASE WHEN p_amount > 0 THEN 'admin_deposit' ELSE 'admin_withdrawal' END,
        jsonb_build_object(
            'admin_id', p_admin_user_id,
            'timestamp', now(),
            'adjustment_type', CASE WHEN p_amount > 0 THEN 'deposit' ELSE 'withdrawal' END
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
