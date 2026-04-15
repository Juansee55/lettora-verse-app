import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import verifiedIcon from "@/assets/verified-icon.png";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type VerificationType = "official" | "premium" | "creator";

interface VerifiedBadgeProps {
  userId: string;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
}

const verificationConfig: Record<VerificationType, { label: string; color: string; glow: string }> = {
  official: {
    label: "Verificado Oficial",
    color: "from-blue-500 to-cyan-400",
    glow: "shadow-[0_0_8px_rgba(59,130,246,0.5)]",
  },
  premium: {
    label: "Verificado Premium",
    color: "from-amber-400 to-yellow-500",
    glow: "shadow-[0_0_8px_rgba(245,158,11,0.5)]",
  },
  creator: {
    label: "Creador Verificado",
    color: "from-violet-500 to-purple-400",
    glow: "shadow-[0_0_8px_rgba(139,92,246,0.5)]",
  },
};

const sizeMap = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

const VerifiedBadge = ({ userId, size = "sm", showTooltip = true }: VerifiedBadgeProps) => {
  const [verification, setVerification] = useState<{ type: VerificationType; status: string } | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await (supabase
        .from("user_verifications" as any)
        .select("verification_type, status")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle() as any);
      if (data) {
        setVerification({ type: data.verification_type, status: data.status });
      }
    };
    fetch();
  }, [userId]);

  if (!verification) return null;

  const config = verificationConfig[verification.type];
  const sizeClass = sizeMap[size];

  const badge = (
    <span className={`inline-flex items-center justify-center ${sizeClass} rounded-full ${config.glow} flex-shrink-0`}>
      <img src={verifiedIcon} alt="Verified" className={`${sizeClass} object-contain`} />
    </span>
  );

  if (!showTooltip) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent side="top" className="text-xs font-medium">
        <span className={`bg-gradient-to-r ${config.color} bg-clip-text text-transparent`}>
          {config.label}
        </span>
      </TooltipContent>
    </Tooltip>
  );
};

export default VerifiedBadge;
