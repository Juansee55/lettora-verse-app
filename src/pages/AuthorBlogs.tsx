import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, PenLine, Eye, Heart, Trash2 } from "lucide-react";
import { IOSHeader } from "@/components/ios/IOSHeader";
import BackButton from "@/components/navigation/BackButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

type Blog = { id: string; title: string; content: string; cover_url: string | null; author_id: string; views_count: number; likes_count: number; created_at: string };

const AuthorBlogs = () => {
  const nav = useNavigate();
  const [posts, setPosts] = useState<Blog[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const [tab, setTab] = useState<"feed" | "mine">("feed");
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);
  useEffect(() => { load(); }, [tab, uid]);

  const load = async () => {
    let q = supabase.from("author_blogs").select("*").order("created_at", { ascending: false }).limit(50);
    if (tab === "mine" && uid) q = q.eq("author_id", uid);
    else q = q.eq("is_published", true);
    const { data } = await q;
    setPosts((data ?? []) as Blog[]);
  };

  const create = async () => {
    if (!title.trim() || !content.trim() || !uid) return;
    const { error } = await supabase.from("author_blogs").insert({ title, content, author_id: uid });
    if (error) return toast.error(error.message);
    toast.success("Publicado");
    setTitle(""); setContent(""); setCreating(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar entrada?")) return;
    await supabase.from("author_blogs").delete().eq("id", id);
    load();
  };

  return (
    <div className="min-h-screen pb-safe bg-background">
      <IOSHeader
        title="Blogs"
        leftAction={<BackButton />}
        rightAction={<button onClick={() => setCreating(v => !v)} className="text-primary"><Plus className="w-5 h-5" /></button>}
      />
      <div className="p-4 max-w-2xl mx-auto space-y-3">
        <div className="flex gap-2">
          <button onClick={() => setTab("feed")} className={`flex-1 py-2 rounded-xl text-sm ${tab==="feed"?"bg-primary text-primary-foreground":"bg-muted"}`}>Descubrir</button>
          <button onClick={() => setTab("mine")} className={`flex-1 py-2 rounded-xl text-sm ${tab==="mine"?"bg-primary text-primary-foreground":"bg-muted"}`}>Míos</button>
        </div>

        {creating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="liquid-glass rounded-2xl p-4 space-y-2">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título" className="w-full bg-muted/60 rounded-xl px-3 py-2 text-sm" />
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={6} placeholder="Escribe tu entrada..." className="w-full bg-muted/60 rounded-xl px-3 py-2 text-sm" />
            <button onClick={create} className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">Publicar</button>
          </motion.div>
        )}

        {posts.map(p => (
          <motion.article key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="liquid-glass rounded-2xl p-4">
            <div className="flex items-start gap-2">
              <PenLine className="w-4 h-4 text-primary mt-1" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">{p.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-6">{p.content}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{p.views_count}</span>
                  <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{p.likes_count}</span>
                  <span>{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              {p.author_id === uid && (
                <button onClick={() => remove(p.id)} className="text-destructive/70 p-1"><Trash2 className="w-4 h-4" /></button>
              )}
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
};
export default AuthorBlogs;