import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ChevronRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const EventBanner = () => {
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const fetchActiveEvent = async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title, description, status")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) setEvent(data);
    };
    fetchActiveEvent();
  }, []);

  if (!event || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, height: 0 }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        exit={{ opacity: 0, y: -10, height: 0 }}
        className="mx-4 mt-3"
      >
        <div
          onClick={() => navigate(`/event/${event.id}`)}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-primary/70 p-4 active:scale-[0.98] transition-transform cursor-pointer shadow-lg shadow-primary/20"
        >
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-8 w-16 h-16 bg-white/5 rounded-full translate-y-1/2" />

          <div className="relative flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <Trophy className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-bold text-primary-foreground uppercase tracking-wider">
                  En vivo
                </span>
              </div>
              <h3 className="text-primary-foreground font-bold text-[15px] truncate">{event.title}</h3>
              {event.description && (
                <p className="text-primary-foreground/70 text-[12px] truncate">{event.description}</p>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-primary-foreground/60 flex-shrink-0" />
          </div>

          {/* Dismiss button */}
          <button
            onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
            className="absolute top-2 right-2 p-1 rounded-full bg-white/10 active:bg-white/20"
          >
            <X className="w-3 h-3 text-primary-foreground/60" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EventBanner;
