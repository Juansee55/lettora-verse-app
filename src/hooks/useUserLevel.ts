import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserLevelData {
  xp: number;
  level: number;
  rank: string;
  nextLevelXp: number;
  progress: number; // 0-100
}

const RANKS: Record<string, { min: number; max: number; label: string; emoji: string }> = {
  reader: { min: 1, max: 5, label: "Lector", emoji: "📖" },
  author: { min: 6, max: 10, label: "Autor", emoji: "✍️" },
  creator: { min: 11, max: 20, label: "Creador", emoji: "🌟" },
  master: { min: 21, max: 999, label: "Maestro narrativo", emoji: "🏆" },
};

export const getRankForLevel = (level: number) => {
  for (const [key, rank] of Object.entries(RANKS)) {
    if (level >= rank.min && level <= rank.max) {
      return { key, ...rank };
    }
  }
  return { key: "reader", ...RANKS.reader };
};

const XP_THRESHOLDS = [0, 60, 120, 180, 240, 300, 440, 580, 720, 860, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000];

export const getXpForNextLevel = (level: number): number => {
  if (level >= 21) return Infinity;
  return XP_THRESHOLDS[level] || 2000;
};

export const getXpForCurrentLevel = (level: number): number => {
  if (level <= 1) return 0;
  return XP_THRESHOLDS[level - 1] || 0;
};

export const useUserLevel = (userId?: string | null) => {
  const [levelData, setLevelData] = useState<UserLevelData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const fetch = async () => {
      const { data } = await supabase
        .from("user_levels")
        .select("xp, level")
        .eq("user_id", userId)
        .maybeSingle();

      if (data) {
        const rank = getRankForLevel(data.level);
        const currentLevelXp = getXpForCurrentLevel(data.level);
        const nextLevelXp = getXpForNextLevel(data.level);
        const progress = nextLevelXp === Infinity ? 100 : Math.min(100, ((data.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100);
        setLevelData({
          xp: data.xp,
          level: data.level,
          rank: rank.label,
          nextLevelXp,
          progress,
        });
      } else {
        setLevelData({ xp: 0, level: 1, rank: "Lector", nextLevelXp: 60, progress: 0 });
      }
      setLoading(false);
    };
    fetch();
  }, [userId]);

  return { levelData, loading };
};
