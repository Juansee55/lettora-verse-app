import { Crown } from "lucide-react";

interface PremiumBadgeProps {
  compact?: boolean;
}

const PremiumBadge = ({ compact = false }: PremiumBadgeProps) => {
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/15 rounded-full">
        <Crown className="w-3 h-3 text-amber-500" />
        <span className="text-[11px] font-bold text-amber-600">PRO</span>
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-xl border border-amber-500/30">
      <Crown className="w-4 h-4 text-amber-500" />
      <span className="text-[13px] font-bold bg-gradient-to-r from-amber-500 to-yellow-600 bg-clip-text text-transparent">
        Premium
      </span>
    </div>
  );
};

export default PremiumBadge;
