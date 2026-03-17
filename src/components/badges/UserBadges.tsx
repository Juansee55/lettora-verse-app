import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface UserBadgesProps {
  userId: string;
  size?: "sm" | "md";
}

interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
}

const UserBadges = ({ userId, size = "sm" }: UserBadgesProps) => {
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    fetchBadges();
  }, [userId]);

  const fetchBadges = async () => {
    // Get equipped badge IDs
    const { data: equipped } = await (supabase
      .from("user_equipped_badges" as any)
      .select("badge_id")
      .eq("user_id", userId) as any);

    if (!equipped || equipped.length === 0) return;

    const badgeIds = equipped.map((e: any) => e.badge_id);
    const { data: badgeData } = await (supabase
      .from("user_badges" as any)
      .select("id, name, emoji, description")
      .in("id", badgeIds)
      .eq("is_active", true) as any);

    if (badgeData) setBadges(badgeData);
  };

  if (badges.length === 0) return null;

  const sizeClass = size === "sm" ? "text-[12px]" : "text-[14px]";

  return (
    <span className="inline-flex items-center gap-0.5">
      {badges.slice(0, 3).map((badge) => (
        <Tooltip key={badge.id}>
          <TooltipTrigger asChild>
            <span className={`${sizeClass} cursor-default`}>{badge.emoji}</span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {badge.name}
          </TooltipContent>
        </Tooltip>
      ))}
    </span>
  );
};

export default UserBadges;
