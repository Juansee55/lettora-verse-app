import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CreateStoryModal from "./CreateStoryModal";
import StoryViewer from "./StoryViewer";

interface StoryUser {
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  stories: { id: string; media_url: string | null; media_type: string; text_content: string | null; background_color: string; created_at: string }[];
  hasUnviewed: boolean;
}

const StoriesBar = () => {
  const [storyUsers, setStoryUsers] = useState<StoryUser[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [viewingUser, setViewingUser] = useState<StoryUser | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    const { data: stories } = await supabase
      .from("stories")
      .select("id, user_id, media_url, media_type, text_content, background_color, created_at")
      .order("created_at", { ascending: false });

    if (!stories || stories.length === 0) return;

    // Get viewed stories
    let viewedIds = new Set<string>();
    if (user) {
      const { data: views } = await supabase
        .from("story_views")
        .select("story_id")
        .eq("user_id", user.id);
      if (views) viewedIds = new Set(views.map(v => v.story_id));
    }

    // Get unique user IDs
    const userIds = [...new Set(stories.map(s => s.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url")
      .in("id", userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Group stories by user
    const grouped = new Map<string, StoryUser>();
    for (const story of stories) {
      const p = profileMap.get(story.user_id);
      if (!p) continue;
      if (!grouped.has(story.user_id)) {
        grouped.set(story.user_id, {
          user_id: story.user_id,
          display_name: p.display_name || "Usuario",
          username: p.username || "user",
          avatar_url: p.avatar_url,
          stories: [],
          hasUnviewed: false,
        });
      }
      const group = grouped.get(story.user_id)!;
      group.stories.push(story);
      if (!viewedIds.has(story.id)) group.hasUnviewed = true;
    }

    // Put current user first
    const sorted = [...grouped.values()].sort((a, b) => {
      if (a.user_id === user?.id) return -1;
      if (b.user_id === user?.id) return 1;
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      return 0;
    });

    setStoryUsers(sorted);
  };

  return (
    <>
      <div className="px-4 py-3 border-b border-border/50">
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {/* Create Story */}
          <button onClick={() => setShowCreate(true)} className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center border-2 border-dashed border-primary/40">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">Tu historia</span>
          </button>

          {/* User Stories */}
          {storyUsers.map(user => (
            <button
              key={user.user_id}
              onClick={() => setViewingUser(user)}
              className="flex flex-col items-center gap-1 flex-shrink-0"
            >
              <div className={`w-16 h-16 rounded-full p-[2px] ${user.hasUnviewed ? "bg-gradient-hero" : "bg-muted"}`}>
                <div className="w-full h-full rounded-full bg-background p-[2px]">
                  <div className="w-full h-full rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-bold overflow-hidden">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      user.display_name[0]
                    )}
                  </div>
                </div>
              </div>
              <span className="text-[11px] text-muted-foreground font-medium truncate max-w-[64px]">
                {user.user_id === currentUserId ? "Tu" : user.display_name.split(" ")[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <CreateStoryModal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); fetchStories(); }}
      />

      {viewingUser && (
        <StoryViewer
          stories={viewingUser.stories}
          userName={viewingUser.display_name}
          userAvatar={viewingUser.avatar_url}
          onClose={() => { setViewingUser(null); fetchStories(); }}
        />
      )}
    </>
  );
};

export default StoriesBar;
