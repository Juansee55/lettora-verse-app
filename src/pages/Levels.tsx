import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Zap, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserLevel, getRankForLevel } from "@/hooks/useUserLevel";
import LevelBadge from "@/components/levels/LevelBadge";
import LevelRewards from "@/components/levels/LevelRewards";
import { Progress } from "@/components/ui/progress";

const ranks = [
  { min: 1, max: 5, emoji: "📖", label: "Lector", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { min: 6, max: 10, emoji: "✍️", label: "Autor", color: "text-blue-500", bg: "bg-blue-500/10" },
  { min: 11, max: 20, emoji: "🌟", label: "Creador", color: "text-amber-500", bg: "bg-amber-500/10" },
  { min: 21, max: 99, emoji: "🏆", label: "Maestro Narrativo", color: "text-purple-500", bg: "bg-purple-500/10" },
];

const xpActions = [
  { action: "Publicar microhistoria", xp: 10, icon: "📝" },
  { action: "Publicar post", xp: 8, icon: "📸" },
  { action: "Recibir like", xp: 5, icon: "❤️" },
  { action: "Comentar", xp: 3, icon: "💬" },
  { action: "Nuevo seguidor", xp: 3, icon: "👥" },
  { action: "Dar like", xp: 2, icon: "👍" },
];

const LevelsPage = () => {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { levelData, loading: levelLoading } = useUserLevel(currentUserId);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setCurrentUserId(user.id);
      setLoading(false);
    };
    init();
  }, [navigate]);

  if (loading || levelLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  const currentRank = levelData ? getRankForLevel(levelData.level) : null;

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Header */}
      <header className="ios-header">
        <div className="flex items-center gap-3 px-4 h-[52px]">
          <button onClick={() => navigate(-1)} className="flex items-center text-primary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[17px] font-semibold flex-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Niveles y Progreso
          </h1>
          <Zap className="w-5 h-5 text-primary" />
        </div>
      </header>

      {/* Current Level Card */}
      {levelData && (
        <div className="px-4 mt-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 rounded-2xl p-5 border border-primary/20"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center text-3xl">
                {currentRank?.emoji}
              </div>
              <div className="flex-1">
                <p className="text-[12px] text-muted-foreground uppercase tracking-wide font-medium">Tu rango actual</p>
                <p className="text-[22px] font-bold">{currentRank?.label}</p>
                <p className="text-[13px] text-muted-foreground">Nivel {levelData.level} · {levelData.xp} XP</p>
              </div>
            </div>
            {levelData.level < 21 && (
              <div className="mt-4">
                <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
                  <span>Progreso al siguiente nivel</span>
                  <span>{levelData.xp} / {levelData.nextLevelXp} XP</span>
                </div>
                <Progress value={levelData.progress} className="h-2" />
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Ranks Roadmap */}
      <div className="px-4 mt-6">
        <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1 flex items-center gap-2">
          <Trophy className="w-4 h-4" />
          Rangos
        </h2>
        <div className="space-y-2">
          {ranks.map((rank, i) => {
            const isCurrent = levelData && levelData.level >= rank.min && levelData.level <= rank.max;
            const isUnlocked = levelData && levelData.level >= rank.min;
            return (
              <motion.div
                key={rank.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  isCurrent
                    ? "border-primary/30 bg-primary/5"
                    : isUnlocked
                    ? "border-border/50 bg-card"
                    : "border-border/30 bg-muted/30 opacity-60"
                }`}
              >
                <div className={`w-10 h-10 rounded-full ${rank.bg} flex items-center justify-center text-lg`}>
                  {rank.emoji}
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold">{rank.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Nivel {rank.min}{rank.max < 99 ? ` - ${rank.max}` : "+"}
                  </p>
                </div>
                {isCurrent && (
                  <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-semibold">
                    Actual
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* XP Guide */}
      <div className="px-4 mt-6">
        <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Cómo ganar XP
        </h2>
        <div className="bg-card rounded-xl divide-y divide-border/50">
          {xpActions.map((item) => (
            <div key={item.action} className="flex items-center gap-3 px-3.5 py-3">
              <span className="text-lg">{item.icon}</span>
              <span className="flex-1 text-[13px]">{item.action}</span>
              <span className="text-[13px] font-semibold text-primary">+{item.xp} XP</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rewards */}
      {levelData && currentUserId && (
        <div className="px-4">
          <LevelRewards currentLevel={levelData.level} userId={currentUserId} />
        </div>
      )}
    </div>
  );
};

export default LevelsPage;
