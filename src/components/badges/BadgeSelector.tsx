import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Award, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BadgeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  badge_type: string;
}

const BadgeSelector = ({ isOpen, onClose }: BadgeSelectorProps) => {
  const { toast } = useToast();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [equippedIds, setEquippedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: allBadges }, { data: equipped }] = await Promise.all([
      supabase.from("user_badges" as any).select("*").eq("is_active", true) as any,
      supabase.from("user_equipped_badges" as any).select("badge_id").eq("user_id", user.id) as any,
    ]);

    setBadges(allBadges || []);
    setEquippedIds((equipped || []).map((e: any) => e.badge_id));
    setLoading(false);
  };

  const toggleBadge = async (badgeId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const isEquipped = equippedIds.includes(badgeId);

    if (isEquipped) {
      await (supabase.from("user_equipped_badges" as any).delete().eq("user_id", user.id).eq("badge_id", badgeId) as any);
      setEquippedIds(prev => prev.filter(id => id !== badgeId));
      toast({ title: "Insignia removida" });
    } else {
      if (equippedIds.length >= 3) {
        toast({ title: "Máximo 3 insignias", description: "Quita una para añadir otra.", variant: "destructive" });
        return;
      }
      await (supabase.from("user_equipped_badges" as any).insert({ user_id: user.id, badge_id: badgeId }) as any);
      setEquippedIds(prev => [...prev, badgeId]);
      toast({ title: "Insignia equipada" });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Mis insignias
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="p-4">
            <p className="text-[13px] text-muted-foreground mb-3">
              Equipa hasta 3 insignias que aparecerán junto a tu nombre.
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : badges.length === 0 ? (
              <div className="text-center py-8">
                <Award className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">No hay insignias disponibles.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {badges.map(badge => {
                  const isEquipped = equippedIds.includes(badge.id);
                  return (
                    <button
                      key={badge.id}
                      onClick={() => toggleBadge(badge.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        isEquipped ? "bg-primary/10 ring-1 ring-primary/30" : "bg-muted/30 hover:bg-muted/50"
                      }`}
                    >
                      <span className="text-2xl">{badge.emoji}</span>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-medium text-[14px]">{badge.name}</p>
                        {badge.description && (
                          <p className="text-[12px] text-muted-foreground truncate">{badge.description}</p>
                        )}
                      </div>
                      {isEquipped && (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BadgeSelector;
