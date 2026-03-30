import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Cache rankings for 5 minutes to avoid excessive queries
let cachedRankings: Record<string, number> | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000;

export const useTopRanking = (bookId: string | undefined) => {
  const [topPosition, setTopPosition] = useState<number | null>(null);

  useEffect(() => {
    if (!bookId) return;

    const fetchRanking = async () => {
      const now = Date.now();
      
      if (cachedRankings && now - cacheTimestamp < CACHE_DURATION) {
        const pos = cachedRankings[bookId];
        setTopPosition(pos !== undefined ? pos + 1 : null);
        return;
      }

      const { data } = await supabase
        .from("books")
        .select("id")
        .in("status", ["published", "completed"])
        .order("likes_count", { ascending: false })
        .limit(100);

      if (data) {
        const rankings: Record<string, number> = {};
        data.forEach((book, index) => {
          rankings[book.id] = index;
        });
        cachedRankings = rankings;
        cacheTimestamp = now;

        const pos = rankings[bookId];
        setTopPosition(pos !== undefined ? pos + 1 : null);
      }
    };

    fetchRanking();
  }, [bookId]);

  return topPosition;
};
