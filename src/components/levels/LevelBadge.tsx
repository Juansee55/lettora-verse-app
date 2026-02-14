import { getRankForLevel } from "@/hooks/useUserLevel";
import type { UserLevelData } from "@/hooks/useUserLevel";
import { Progress } from "@/components/ui/progress";

interface LevelBadgeProps {
  levelData: UserLevelData;
  compact?: boolean;
  showProgress?: boolean;
}

const LevelBadge = ({ levelData, compact = false, showProgress = false }: LevelBadgeProps) => {
  const rank = getRankForLevel(levelData.level);

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 rounded-full text-[11px] font-semibold text-primary">
        {rank.emoji} Nv.{levelData.level}
      </span>
    );
  }

  return (
    <div className="bg-card rounded-xl p-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-lg">{rank.emoji}</span>
          <div>
            <p className="text-[13px] font-semibold">{rank.label}</p>
            <p className="text-[11px] text-muted-foreground">Nivel {levelData.level} · {levelData.xp} XP</p>
          </div>
        </div>
        <span className="text-[20px] font-bold text-primary">{levelData.level}</span>
      </div>
      {showProgress && levelData.level < 21 && (
        <div className="mt-2">
          <Progress value={levelData.progress} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground mt-1 text-right">
            {levelData.xp} / {levelData.nextLevelXp} XP
          </p>
        </div>
      )}
    </div>
  );
};

export default LevelBadge;
