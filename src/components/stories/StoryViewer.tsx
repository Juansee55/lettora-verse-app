import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Story {
  id: string;
  media_url: string | null;
  media_type: string;
  text_content: string | null;
  background_color: string;
  created_at: string;
}

interface StoryViewerProps {
  stories: Story[];
  userName: string;
  userAvatar: string | null;
  onClose: () => void;
}

const StoryViewer = ({ stories, userName, userAvatar, onClose }: StoryViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const current = stories[currentIndex];

  const markViewed = useCallback(async (storyId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("story_views").upsert(
        { story_id: storyId, user_id: user.id },
        { onConflict: "story_id,user_id" }
      );
    }
  }, []);

  useEffect(() => {
    if (current) markViewed(current.id);
  }, [current, markViewed]);

  useEffect(() => {
    setProgress(0);
    const duration = current?.media_type === "video" ? 15000 : 5000;
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex(i => i + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + (100 / (duration / 50));
      });
    }, 50);
    return () => clearInterval(interval);
  }, [currentIndex, stories.length, current?.media_type, onClose]);

  const goNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
    }
  };

  const formatTime = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return "Ahora";
    return `${h}h`;
  };

  if (!current) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
      >
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2 pt-3">
          {stories.map((_, i) => (
            <div key={i} className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-75"
                style={{
                  width: i < currentIndex ? "100%" : i === currentIndex ? `${progress}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-6 left-0 right-0 z-20 flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-bold overflow-hidden">
              {userAvatar ? (
                <img src={userAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                userName[0]
              )}
            </div>
            <div>
              <p className="text-white text-[14px] font-semibold">{userName}</p>
              <p className="text-white/60 text-[12px]">{formatTime(current.created_at)}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="w-full h-full flex items-center justify-center">
          {current.media_type === "text" || (!current.media_url && current.text_content) ? (
            <div
              className="w-full h-full flex items-center justify-center p-8"
              style={{ backgroundColor: current.background_color }}
            >
              <p className="text-white text-2xl font-display font-bold text-center leading-relaxed max-w-md">
                {current.text_content}
              </p>
            </div>
          ) : current.media_type === "video" ? (
            <video
              src={current.media_url!}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full relative">
              <img
                src={current.media_url!}
                alt=""
                className="w-full h-full object-contain"
              />
              {current.text_content && (
                <div className="absolute bottom-20 left-0 right-0 text-center px-6">
                  <p className="text-white text-lg font-semibold drop-shadow-lg">{current.text_content}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tap zones */}
        <div className="absolute inset-0 z-10 flex">
          <button className="flex-1" onClick={goPrev} />
          <button className="flex-[2]" onClick={goNext} />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StoryViewer;
