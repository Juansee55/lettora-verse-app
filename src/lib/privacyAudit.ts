import { supabase } from "@/integrations/supabase/client";

/**
 * Registra una acción administrativa sobre datos de usuarios.
 * Solo se guarda si quien la ejecuta es administrador (protegido por RLS).
 */
export const logPrivacyAction = async (
  action: string,
  options: { targetUserId?: string | null; entityType?: string; details?: Record<string, unknown> } = {},
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("privacy_audit_log").insert({
      admin_id: user.id,
      target_user_id: options.targetUserId ?? null,
      action,
      entity_type: options.entityType ?? null,
      details: (options.details ?? {}) as any,
    });
  } catch {
    // El registro nunca debe bloquear la acción principal.
  }
};
