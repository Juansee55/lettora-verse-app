
DROP TRIGGER IF EXISTS on_notification_send_push ON public.notifications;
DROP FUNCTION IF EXISTS public.trigger_push_notification();
DROP TABLE IF EXISTS public.push_subscriptions;
