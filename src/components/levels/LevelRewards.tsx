import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Check, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getRankForLevel } from "@/hooks/useUserLevel";

interface LevelReward {
  id: string;
  name: string;
  item_type: string;
  rarity: string;
  css_value: string | null;
  level_required: number;
  description: string | null;
  owned: boolean;
}

interface LevelRewardsProps {
  currentLevel: number;
  userId: string | null;
}

const rarityColors: Record<string, string> = {
  common: "border-emerald-500/30 bg-emerald-500/5",
  rare: "border-blue-500/30 bg-blue-500/5",
  epic: "border-amber-500/30 bg-amber-500/5",
  legendary: "border-purple-500/30 bg-purple-500/5",
};

const rarityLabels: Record<string, string> = {
  common: "Común",
  rare: "Raro",
  epic: "Épico",
  legendary: "Legendario",
};

const LevelRewards = ({ currentLevel, userId }: LevelRewardsProps) => {
  const [rewards, setRewards] = useState<LevelReward[]>([]);

  useEffect(() => {
    if (!userId) return;
    const fetch = async () => {
      const { data: items } = await supabase
        .from("profile_items")
        .select("id, name, item_type, rarity, css_value, level_required, description")
        .not("level_required", "is", null)
        .order("level_required", { ascending: true });

      if (!items) return;

      const { data: owned } = await supabase
        .from("user_items")
        .select("item_id")
        .eq("user_id", userId);

      const ownedIds = new Set((owned || []).map(o => o.item_id));

      setRewards(items.map(item => ({
        ...item,
        level_required: item.level_required!,
        owned: ownedIds.has(item.id),
      })));
    };
    fetch();
  }, [userId, currentLevel]);

  if (rewards.length === 0) return null;

  // Group by rank
  const groups = [
    { label: "📖 Lector", levels: [1, 5], rewards: rewards.filter(r => r.level_required >= 1 && r.level_required <= 5) },
    { label: "✍️ Autor", levels: [6, 10], rewards: rewards.filter(r => r.level_required >= 6 && r.level_required <= 10) },
    { label: "🌟 Creador", levels: [11, 20], rewards: rewards.filter(r => r.level_required >= 11 && r.level_required <= 20) },
    { label: "🏆 Maestro", levels: [21, 99], rewards: rewards.filter(r => r.level_required >= 21) },
  ].filter(g => g.rewards.length > 0);

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3 px-1">
        <Gift className="w-4 h-4 text-primary" />
        <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
          Recompensas por nivel
        </h3>
      </div>

      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="text-[12px] font-semibold text-muted-foreground mb-1.5 px-1">{group.label}</p>
            <div className="space-y-1.5">
              {group.rewards.map((reward, i) => {
                const unlocked = currentLevel >= reward.level_required;
                return (
                  <motion.div
                    key={reward.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border ${
                      unlocked ? rarityColors[reward.rarity] : "border-border/50 bg-muted/30 opacity-60"
                    }`}
                  >
                    {/* Preview */}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-background relative">
                      {reward.item_type === "frame" ? (
                        <div className={`w-9 h-9 rounded-full ${reward.css_value || ""}`} />
                      ) : (
                        <span className={`text-[13px] font-bold ${reward.css_value || ""}`}>Aa</span>
                      )}
                      {!unlocked && (
                        <div className="absolute inset-0 rounded-full bg-background/60 flex items-center justify-center">
                          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate">{reward.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Nv.{reward.level_required} · {rarityLabels[reward.rarity]}
                        {reward.item_type === "frame" ? " · Marco" : " · Color"}
                      </p>
                    </div>

                    {/* Status */}
                    {reward.owned ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                    ) : unlocked ? (
                      <span className="text-[11px] font-semibold text-primary">¡Nuevo!</span>
                    ) : (
                      <Lock className="w-4 h-4 text-muted-foreground/50" />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LevelRewards;
