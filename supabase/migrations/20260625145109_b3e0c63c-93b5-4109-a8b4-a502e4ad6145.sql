
-- 1) Storage policies: announcements + weapon-images (admin-only delete/insert)
DROP POLICY IF EXISTS "Admins can delete announcement images" ON storage.objects;
CREATE POLICY "Admins can delete announcement images"
ON storage.objects FOR DELETE
USING (bucket_id = 'announcements' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can upload weapon images" ON storage.objects;
CREATE POLICY "Admins can upload weapon images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'weapon-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete weapon images" ON storage.objects;
CREATE POLICY "Admins can delete weapon images"
ON storage.objects FOR DELETE
USING (bucket_id = 'weapon-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) Remove permissive SELECT on chat-media; participant-scoped policy remains
DROP POLICY IF EXISTS "Anyone can view chat media" ON storage.objects;

-- 3) Drop birth_date column from profiles to remove PII exposure
ALTER TABLE public.profiles DROP COLUMN IF EXISTS birth_date;

-- 4) Remove insecure purchase_item function (purchase_shop_item supersedes it)
DROP FUNCTION IF EXISTS public.purchase_item(uuid, uuid);

-- 5) Update push trigger to pass internal secret so edge function can authenticate caller
CREATE OR REPLACE FUNCTION public.on_notification_send_push()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := 'https://xsumombhmpdyegokwbfq.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-secret', '4d043533114961fbb2dd0dcd05ccf3d753a9cd6f13db313d6e653bfe49bf9521'
      ),
      body := jsonb_build_object(
        'notification_id', NEW.id,
        'user_id', NEW.user_id,
        'type', NEW.type,
        'title', NEW.title,
        'message', NEW.message,
        'link', NEW.link
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;
