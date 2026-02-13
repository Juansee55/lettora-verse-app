import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, Gift, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface ValentineQuestBannerProps {
  onComposeClick: () => void;
}

const VALENTINE_FRAME_ID = "83c65d8d-0fa2-4d19-a519-64ad380857a7";
const VALENTINE_NAME_ID = "5c6512e8-b10e-46af-beeb-77aa010e8046";

const ValentineQuestBanner = ({ onComposeClick }: ValentineQuestBannerProps) => {
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkQuestStatus();
  }, []);

  const checkQuestStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("valentine_quest_completions")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    setCompleted(!!data);
    setLoading(false);
  };

  if (loading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-4 rounded-2xl overflow-hidden valentine-shadow"
    >
      <div className="valentine-gradient relative p-4">
        {/* Decorative sparkles */}
        <div className="absolute top-2 right-3 opacity-50">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="absolute bottom-2 left-3 opacity-30">
          <Heart className="w-3 h-3 text-white fill-white" />
        </div>

        <div className="flex items-start gap-3">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0"
          >
            {completed ? (
              <Check className="w-5 h-5 text-white" />
            ) : (
              <Gift className="w-5 h-5 text-white" />
            )}
          </motion.div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[11px] font-semibold text-white/70 uppercase tracking-wider">
                Quest de San Valentín
              </span>
              <Heart className="w-3 h-3 text-white/70 fill-white/50" />
            </div>

            {completed ? (
              <>
                <p className="text-[15px] font-bold text-white leading-tight">
                  ¡Quest completado! 💕
                </p>
                <p className="text-[12px] text-white/80 mt-0.5">
                  Has desbloqueado el marco y nombre rosa exclusivos
                </p>
              </>
            ) : (
              <>
                <p className="text-[15px] font-bold text-white leading-tight">
                  Publica un microrrelato 💌
                </p>
                <p className="text-[12px] text-white/80 mt-0.5">
                  Obtén un marco de perfil exclusivo y tu nombre en rosa animado
                </p>
                <Button
                  size="sm"
                  className="mt-2.5 rounded-xl h-8 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-[12px] font-semibold border border-white/30"
                  onClick={onComposeClick}
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Escribir microrrelato
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Event deadline */}
        <div className="mt-3 pt-2.5 border-t border-white/20">
          <p className="text-[11px] text-white/60 text-center">
            ⏰ Disponible hasta el 16 de febrero
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default ValentineQuestBanner;
