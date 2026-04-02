import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Megaphone, Sparkles, PartyPopper, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Announcement {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  created_at: string;
  animation_type?: string;
}

const animationVariants = {
  // Type 1: Slide up with bounce
  slide: {
    overlay: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
    card: {
      initial: { opacity: 0, y: 300, scale: 0.8 },
      animate: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", damping: 18, stiffness: 200 } },
      exit: { opacity: 0, y: 300, scale: 0.8 },
    },
  },
  // Type 2: Scale from center with rotation
  scale: {
    overlay: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
    card: {
      initial: { opacity: 0, scale: 0, rotate: -10 },
      animate: { opacity: 1, scale: 1, rotate: 0, transition: { type: "spring", damping: 15, stiffness: 250, delay: 0.1 } },
      exit: { opacity: 0, scale: 0, rotate: 10 },
    },
  },
  // Type 3: Cinematic fade with parallax
  cinematic: {
    overlay: { initial: { opacity: 0 }, animate: { opacity: 1, transition: { duration: 0.6 } }, exit: { opacity: 0 } },
    card: {
      initial: { opacity: 0, y: 60, scale: 1.05 },
      animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
      exit: { opacity: 0, y: -40, scale: 0.95, transition: { duration: 0.4 } },
    },
  },
};

const gradientStyles: Record<string, string> = {
  slide: "from-violet-600 via-primary to-fuchsia-500",
  scale: "from-amber-500 via-orange-500 to-rose-500",
  cinematic: "from-emerald-600 via-teal-500 to-cyan-400",
};

const iconMap: Record<string, React.ReactNode> = {
  slide: <Bell className="w-5 h-5" />,
  scale: <PartyPopper className="w-5 h-5" />,
  cinematic: <Sparkles className="w-5 h-5" />,
};

const AnnouncementBanner = () => {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetchLatestAnnouncement();
  }, []);

  const fetchLatestAnnouncement = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: announcements } = await supabase
      .from("announcements" as any)
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1) as any;

    if (!announcements || announcements.length === 0) return;
    const latest = announcements[0] as Announcement;

    const { data: dismissal } = await supabase
      .from("announcement_dismissals" as any)
      .select("id")
      .eq("announcement_id", latest.id)
      .eq("user_id", user.id)
      .maybeSingle() as any;

    if (!dismissal) {
      setAnnouncement(latest);
      setVisible(true);
    }
  };

  const dismiss = async () => {
    if (!announcement) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase.from("announcement_dismissals" as any).insert({
      announcement_id: announcement.id,
      user_id: user.id,
    } as any) as any);

    setVisible(false);
  };

  if (!visible || !announcement) return null;

  const animType = (announcement.animation_type || "slide") as keyof typeof animationVariants;
  const variants = animationVariants[animType] || animationVariants.slide;
  const gradient = gradientStyles[animType] || gradientStyles.slide;
  const icon = iconMap[animType] || iconMap.slide;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          {...variants.overlay}
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={dismiss}
        >
          {/* Floating particles for cinematic */}
          {animType === "cinematic" && (
            <>
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 100, x: Math.random() * 200 - 100 }}
                  animate={{
                    opacity: [0, 0.6, 0],
                    y: [100, -200],
                    x: Math.random() * 100 - 50,
                  }}
                  transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: i * 0.5 }}
                  className="absolute w-2 h-2 rounded-full bg-primary/40"
                />
              ))}
            </>
          )}

          <motion.div
            {...variants.card}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative"
          >
            {/* Gradient accent bar */}
            <div className={`h-1.5 w-full bg-gradient-to-r ${gradient}`} />

            {/* Sparkle decoration for scale type */}
            {animType === "scale" && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="absolute -top-3 -right-3 text-3xl"
              >
                🎉
              </motion.div>
            )}

            {/* Image */}
            {announcement.image_url && (
              <div className="w-full h-48 overflow-hidden relative">
                <motion.img
                  src={announcement.image_url}
                  alt=""
                  className="w-full h-full object-cover"
                  initial={animType === "cinematic" ? { scale: 1.2 } : {}}
                  animate={animType === "cinematic" ? { scale: 1 } : {}}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
                <div className={`absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent`} />
              </div>
            )}

            {/* Content */}
            <div className="p-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-2 mb-3"
              >
                <div className={`w-9 h-9 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                  {icon}
                </div>
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                  {animType === "scale" ? "¡Novedad!" : animType === "cinematic" ? "Anuncio especial" : "Novedad"}
                </span>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xl font-display font-bold mb-2"
              >
                {announcement.title}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-[15px] text-muted-foreground leading-relaxed"
              >
                {announcement.description}
              </motion.p>
            </div>

            {/* Action */}
            <div className="px-6 pb-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  onClick={dismiss}
                  className={`w-full h-12 rounded-2xl font-semibold text-white bg-gradient-to-r ${gradient} shadow-lg hover:shadow-xl active:scale-[0.98] transition-all`}
                >
                  Entendido
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AnnouncementBanner;
