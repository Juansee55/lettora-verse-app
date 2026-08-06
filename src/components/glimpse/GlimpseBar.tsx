import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import GlimpseCreator from "./GlimpseCreator";
import GlimpseViewer, { type GlimpseStory } from "./GlimpseViewer";
import BestFriendsSheet from "./BestFriendsSheet";

interface GlimpseGroup {
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  stories: GlimpseStory[];
  hasUnviewed: boolean;
}

const SELECT =
  "id, user_id, media_url, media_type, text_content, background_color, created_at, duration_ms, filter, overlays, music, likes_count, replies_count, views_count, expires_at";

const GlimpseBar = () => {
  const [groups, setGroups] = useState<GlimpseGroup[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [myAvatar, setMyAvatar] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<GlimpseGroup | null>(null);
  const [bestFriends, setBestFriends] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);

    const { data: stories } = await supabase
      .from("stories")
      .select(SELECT)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true });

    if (!stories) { setGroups([]); return; }

    let viewed = new Set<string>();
    if (user) {
      const { data: views } = await supabase.from("story_views").select("story_id").eq("user_id", user.id);
      viewed = new Set((views ?? []).map((v) => v.story_id));
      const { data: me } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
      setMyAvatar(me?.avatar_url ?? null);
    }

    const ids = [...new Set(stories.map((s) => s.user_id))];
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("id, display_name, username, avatar_url").in("id", ids)
      : { data: [] as never[] };
    const map = new Map((profiles ?? []).map((p) => [p.id, p]));

    const grouped = new Map<string, GlimpseGroup>();
    for (const s of stories) {
      const p = map.get(s.user_id);
      if (!p) continue;
      if (!grouped.has(s.user_id)) {
        grouped.set(s.user_id, {
          user_id: s.user_id,
          display_name: p.display_name || "Usuario",
          username: p.username || "user",
          avatar_url: p.avatar_url,
          stories: [],
          hasUnviewed: false,
        });
      }
      const g = grouped.get(s.user_id)!;
      g.stories.push(s as GlimpseStory);
      if (!viewed.has(s.id)) g.hasUnviewed = true;
    }

    const sorted = [...grouped.values()].sort((a, b) => {
      if (a.user_id === user?.id) return -1;
      if (b.user_id === user?.id) return 1;
      return Number(b.hasUnviewed) - Number(a.hasUnviewed);
    });
    setGroups(sorted);
  }, []);

  useEffect(() => { load(); }, [load]);

  const mine = groups.find((g) => g.user_id === userId);
  const others = groups.filter((g) => g.user_id !== userId);

  return (
    <>
      <div className="px-4 py-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[13px] font-semibold text-muted-foreground">Glimpse</p>
          <button onClick={() => setBestFriends(true)} className="flex items-center gap-1 text-[12px] text-primary font-medium">
            <Star className="w-3.5 h-3.5" /> Mejores amigos
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {/* Tu Glimpse */}
          <button
            onClick={() => (mine ? setViewing(mine) : setCreating(true))}
            className="flex flex-col items-center gap-1 flex-shrink-0"
          >
            <div className="relative w-[66px] h-[66px]">
              <div className={`w-full h-full rounded-full p-[2.5px] ${mine?.hasUnviewed ? "bg-gradient-to-tr from-primary via-accent to-primary" : "bg-border"}`}>
                <div className="w-full h-full rounded-full bg-background p-[2px]">
                  <div className="w-full h-full rounded-full overflow-hidden bg-muted flex items-center justify-center">
                    {myAvatar ? <img src={myAvatar} alt="" className="w-full h-full object-cover" /> : <Plus className="w-6 h-6 text-primary" />}
                  </div>
                </div>
              </div>
              <span
                onClick={(e) => { e.stopPropagation(); setCreating(true); }}
                className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-primary border-2 border-background flex items-center justify-center"
              >
                <Plus className="w-3.5 h-3.5 text-primary-foreground" />
              </span>
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">Tu Glimpse</span>
          </button>

          {others.map((g) => (
            <motion.button
              key={g.user_id}
              whileTap={{ scale: 0.94 }}
              onClick={() => setViewing(g)}
              className="flex flex-col items-center gap-1 flex-shrink-0"
            >
              <div className={`w-[66px] h-[66px] rounded-full p-[2.5px] ${g.hasUnviewed ? "bg-gradient-to-tr from-primary via-accent to-primary" : "bg-border"}`}>
                <div className="w-full h-full rounded-full bg-background p-[2px]">
                  <div className="w-full h-full rounded-full overflow-hidden bg-muted flex items-center justify-center font-semibold">
                    {g.avatar_url ? <img src={g.avatar_url} alt="" className="w-full h-full object-cover" /> : g.display_name[0]}
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground truncate max-w-[66px]">
                {g.display_name.split(" ")[0]}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      <GlimpseCreator open={creating} onClose={() => setCreating(false)} onPublished={load} />

      <AnimatePresence>
        {viewing && (
          <GlimpseViewer
            stories={viewing.stories}
            authorName={viewing.display_name}
            authorAvatar={viewing.avatar_url}
            isOwner={viewing.user_id === userId}
            currentUserId={userId}
            onChanged={load}
            onClose={() => { setViewing(null); load(); }}
          />
        )}
        {bestFriends && <BestFriendsSheet key="bf" onClose={() => setBestFriends(false)} />}
      </AnimatePresence>
    </>
  );
};

export default GlimpseBar;