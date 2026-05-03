import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PremiumData {
  isPremium: boolean;
  plan: string | null;
  expiresAt: string | null;
}

export const usePremium = (userId: string | null | undefined) => {
  const [premiumData, setPremiumData] = useState<PremiumData>({
    isPremium: false,
    plan: null,
    expiresAt: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const isSelf = user?.id === userId;

      if (isSelf) {
        const { data } = await supabase
          .from("premium_subscriptions")
          .select("*")
          .eq("user_id", userId)
          .eq("status", "active")
          .maybeSingle();
        if (data) {
          const isActive = !data.expires_at || new Date(data.expires_at) > new Date();
          setPremiumData({ isPremium: isActive, plan: data.plan, expiresAt: data.expires_at });
        }
      } else {
        // For other users, only the public is_premium flag is exposed
        const { data: prof } = await supabase
          .from("profiles")
          .select("is_premium")
          .eq("id", userId)
          .maybeSingle();
        if (prof?.is_premium) {
          setPremiumData({ isPremium: true, plan: null, expiresAt: null });
        }
      }
      setLoading(false);
    };

    fetch();
  }, [userId]);

  return { premiumData, loading };
};
