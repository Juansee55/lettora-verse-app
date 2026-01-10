import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, Share2, Crown, Medal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import ShareAsImage from "./ShareAsImage";

interface TopMicrostory {
  id: string;
  title: string | null;
  content: string;
  likes_count: number;
  author: {
    id: string;
    display_name: string;
    username: string;
    avatar_url: string | null;
  };
}

interface TopMicrostoriesProps {
  limit?: number;
  showHeader?: boolean;
  compact?: boolean;
}

const TopMicrostories = ({ limit = 5, showHeader = true, compact = false }: TopMicrostoriesProps) => {
  const navigate = useNavigate();
  const [stories, setStories] = useState<TopMicrostory[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareStory, setShareStory] = useState<TopMicrostory | null>(null);

  useEffect(() => {
    fetchTopMicrostories();
  }, [limit]);

  const fetchTopMicrostories = async () => {
    // Get first day of current month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data, error } = await supabase
      .from("microstories")
      .select(`
        id,
        title,
        content,
        likes_count,
        author:profiles!author_id (
          id,
          display_name,
          username,
          avatar_url
        )
      `)
      .gte("created_at", firstDayOfMonth)
      .order("likes_count", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching top microstories:", error);
    } else {
      setStories(data || []);
    }
    setLoading(false);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 2:
        return <Medal className="w-4 h-4 text-gray-400" />;
      case 3:
        return <Medal className="w-4 h-4 text-amber-600" />;
      default:
        return <span className="text-xs font-bold text-muted-foreground w-4 text-center">{rank}</span>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (stories.length === 0) {
    return null;
  }

  return (
    <div>
      {showHeader && (
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h2 className="text-xl font-display font-semibold">Top del Mes</h2>
        </div>
      )}

      <div className="space-y-3">
        {stories.map((story, index) => (
          <motion.div
            key={story.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-center gap-3 p-3 bg-card rounded-xl hover:bg-accent/50 transition-colors cursor-pointer ${
              index === 0 ? "ring-2 ring-yellow-500/50" : ""
            }`}
            onClick={() => navigate("/microstories")}
          >
            {/* Rank */}
            <div className="flex-shrink-0 w-6 flex items-center justify-center">
              {getRankIcon(index + 1)}
            </div>

            {/* Author avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0 overflow-hidden">
              {story.author.avatar_url ? (
                <img src={story.author.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                (story.author.display_name || story.author.username || "?")[0].toUpperCase()
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {story.title || story.content.slice(0, 40)}...
              </p>
              <p className="text-xs text-muted-foreground">
                @{story.author.username} • {story.likes_count} likes
              </p>
            </div>

            {/* Share */}
            {!compact && (
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  setShareStory(story);
                }}
              >
                <Share2 className="w-4 h-4" />
              </Button>
            )}
          </motion.div>
        ))}
      </div>

      {/* Share Modal */}
      {shareStory && (
        <ShareAsImage
          isOpen={!!shareStory}
          onClose={() => setShareStory(null)}
          story={shareStory}
        />
      )}
    </div>
  );
};

export default TopMicrostories;
