import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Announcement {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  created_at: string;
}

const AnnouncementBanner = () => {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetchLatestAnnouncement();
  }, []);

  const fetchLatestAnnouncement = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get active announcements
    const { data: announcements } = await supabase
      .from("announcements" as any)
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1) as any;

    if (!announcements || announcements.length === 0) return;

    const latest = announcements[0] as Announcement;

    // Check if user has dismissed it
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
        onClick={dismiss}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          transition={{ type: "spring", damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card rounded-3xl w-full max-w-sm overflow-hidden shadow-lg"
        >
          {/* Image */}
          {announcement.image_url && (
            <div className="w-full h-48 overflow-hidden">
              <img
                src={announcement.image_url}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <Megaphone className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-medium text-primary uppercase tracking-wider">
                Novedad
              </span>
            </div>

            <h2 className="text-xl font-display font-bold mb-2">
              {announcement.title}
            </h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              {announcement.description}
            </p>
          </div>

          {/* Action */}
          <div className="px-6 pb-6">
            <Button
              variant="ios"
              size="ios-lg"
              className="w-full"
              onClick={dismiss}
            >
              Entendido
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AnnouncementBanner;
