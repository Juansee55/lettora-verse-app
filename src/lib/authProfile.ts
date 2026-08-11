import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const firstNonEmpty = (...values: unknown[]) => {
  const value = values.find((candidate) => typeof candidate === "string" && candidate.trim().length > 0);
  return typeof value === "string" ? value.trim() : null;
};

export const getAuthRedirectUrl = (path = "/home") => {
  const base = import.meta.env.BASE_URL || "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return new URL(`${normalizedBase}${path.replace(/^\/+/, "")}`, window.location.origin).toString();
};

/**
 * Keeps public.profiles aligned with the identity provider metadata.
 * The database trigger handles first creation; this also repairs existing
 * profiles created before display_name was populated correctly.
 */
export const syncUserProfile = async (user: User | null | undefined) => {
  if (!user) return;

  const metadata = user.user_metadata ?? {};
  const emailName = user.email?.split("@")[0] ?? null;
  const username = firstNonEmpty(metadata.username, metadata.preferred_username, emailName);
  const displayName = firstNonEmpty(
    metadata.display_name,
    metadata.full_name,
    metadata.name,
    metadata.user_name,
    username,
    emailName,
  );
  const avatarUrl = firstNonEmpty(metadata.avatar_url, metadata.picture);

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      username: username?.toLowerCase() ?? null,
      display_name: displayName,
      avatar_url: avatarUrl,
    });

    // A username collision must not prevent the profile from being created.
    if (error && username) {
      await supabase.from("profiles").insert({
        id: user.id,
        display_name: displayName,
        avatar_url: avatarUrl,
      });
    }
    return;
  }

  const updates: Record<string, string> = {};
  if (!profile.username && username) updates.username = username.toLowerCase();
  if ((!profile.display_name || profile.display_name === "Usuario" || profile.display_name === "Usuarios") && displayName) {
    updates.display_name = displayName;
  }
  if (!profile.avatar_url && avatarUrl) updates.avatar_url = avatarUrl;

  if (Object.keys(updates).length > 0) {
    await supabase.from("profiles").update(updates).eq("id", user.id);
  }
};
