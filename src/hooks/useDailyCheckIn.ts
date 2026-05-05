import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * On app load (and when auth state changes), records a daily check-in for the
 * authenticated user. If the RPC returns a newly awarded medal, shows a toast.
 * Runs at most once per session per user.
 */
export const useDailyCheckIn = () => {
  const calledFor = useRef<string | null>(null);

  useEffect(() => {
    const run = async (userId: string) => {
      if (calledFor.current === userId) return;
      calledFor.current = userId;
      try {
        const { data, error } = await (supabase as any).rpc("record_daily_check_in");
        if (error) return;
        if (data?.medal_awarded) {
          toast.success(
            `${data.medal_awarded.emoji} ¡Nueva medalla mensual! «${data.medal_awarded.name}»`,
            { duration: 6000 }
          );
        }
      } catch {}
    };

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) run(data.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) run(session.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
};