import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Registers a `view` analytics_events row for each route change.
 * Anonymous visits are stored with user_id = null.
 */
const routeToSection = (path: string): string => {
  if (path.startsWith("/home") || path === "/") return "home";
  if (path.startsWith("/explore")) return "explore";
  if (path.startsWith("/library")) return "library";
  if (path.startsWith("/chats") || path.startsWith("/chat/")) return "chats";
  if (path.startsWith("/write")) return "write";
  if (path.startsWith("/microstories")) return "microstories";
  if (path.startsWith("/community")) return "community";
  if (path.startsWith("/profile") || path.startsWith("/user/")) return "profile";
  if (path.startsWith("/book/")) return "book";
  if (path.startsWith("/settings")) return "settings";
  if (path.startsWith("/notifications")) return "notifications";
  if (path.startsWith("/lettoia")) return "lettoia";
  if (path.startsWith("/gang-wars")) return "gang-wars";
  if (path.startsWith("/free-books")) return "free-books";
  if (path.startsWith("/shop")) return "shop";
  if (path.startsWith("/admin")) return "admin";
  if (path.startsWith("/auth")) return "auth";
  return "other";
};

export const useSectionAnalytics = () => {
  const loc = useLocation();
  useEffect(() => {
    const section = routeToSection(loc.pathname);
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (cancelled) return;
        await supabase.from("analytics_events" as any).insert({
          user_id: data?.user?.id ?? null,
          section,
          event_type: "view",
          metadata: { path: loc.pathname },
        } as any);
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [loc.pathname]);
};