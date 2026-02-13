import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to fetch equipped name_color CSS classes for a set of user IDs.
 * Returns a map of userId -> css_value (e.g. "valentine-name-pink").
 */
export const useNameColors = (userIds: string[]) => {
  const [nameColors, setNameColors] = useState<Record<string, string>>({});

  const fetchColors = useCallback(async () => {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueIds.length === 0) return;

    const { data } = await supabase
      .from("user_items")
      .select("user_id, profile_items(css_value, item_type)")
      .in("user_id", uniqueIds)
      .eq("is_equipped", true);

    if (data) {
      const colors: Record<string, string> = {};
      (data as any[]).forEach((item) => {
        if (item.profile_items?.item_type === "name_color" && item.profile_items?.css_value) {
          colors[item.user_id] = item.profile_items.css_value;
        }
      });
      setNameColors(colors);
    }
  }, [userIds.join(",")]);

  useEffect(() => {
    fetchColors();
  }, [fetchColors]);

  return nameColors;
};
