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
      const { data } = await supabase
        .from("premium_subscriptions")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

      if (data) {
        const isActive = !data.expires_at || new Date(data.expires_at) > new Date();
        setPremiumData({
          isPremium: isActive,
          plan: data.plan,
          expiresAt: data.expires_at,
        });
      }
      setLoading(false);
    };

    fetch();
  }, [userId]);

  return { premiumData, loading };
};
