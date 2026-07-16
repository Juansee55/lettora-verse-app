
DROP POLICY IF EXISTS "Anyone can view chat media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can lookup invite by code" ON public.group_invitations;

CREATE OR REPLACE FUNCTION public.lookup_group_invite(_code text)
RETURNS TABLE (
  id uuid,
  conversation_id uuid,
  invite_code text,
  invited_by uuid,
  max_uses integer,
  uses_count integer,
  expires_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, conversation_id, invite_code, invited_by, max_uses, uses_count, expires_at, created_at
  FROM public.group_invitations
  WHERE invite_code = _code
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR uses_count < max_uses)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_group_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_group_invite(text) TO authenticated;
