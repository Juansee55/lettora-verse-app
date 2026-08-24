-- El publicador mensual solo debe ejecutarse desde el cron de base de datos.
-- La revisión humana se realiza mediante cambios de estado en la cola; ningún cliente llama a este RPC.
REVOKE EXECUTE ON FUNCTION public.publish_due_free_books(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_due_free_books(integer) TO service_role;
