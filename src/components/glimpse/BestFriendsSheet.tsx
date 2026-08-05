import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Search, Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Person { id: string; username: string | null; full_name: string | null; avatar_url: string | null; }

const BestFriendsSheet = ({ onClose }: { onClose: () => void }) => {
  const { toast } = useToast();
  const [people, setPeople] = useState<Person[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: follows }, { data: bf }] = await Promise.all([
        supabase.from("followers").select("following_id").eq("follower_id", user.id),
        supabase.from("best_friends").select("friend_id").eq("user_id", user.id),
      ]);
      const ids = (follows ?? []).map((f) => f.following_id);
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles").select("id, username, full_name, avatar_url").in("id", ids);
        setPeople(profs ?? []);
      }
      setFriends((bf ?? []).map((f) => f.friend_id));
      setLoading(false);
    })();
  }, []);

  const toggle = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (friends.includes(id)) {
      setFriends((f) => f.filter((x) => x !== id));
      await supabase.from("best_friends").delete().eq("user_id", user.id).eq("friend_id", id);
    } else {
      setFriends((f) => [...f, id]);
      const { error } = await supabase.from("best_friends").insert({ user_id: user.id, friend_id: id });
      if (error) {
        setFriends((f) => f.filter((x) => x !== id));
        toast({ title: "No se pudo actualizar", variant: "destructive" });
      }
    }
  };

  const filtered = people.filter((p) =>
    `${p.username ?? ""} ${p.full_name ?? ""}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[135] bg-black/60 flex items-end" onClick={onClose}>
      <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
        transition={{ type: "spring", stiffness: 340, damping: 34 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-h-[80vh] rounded-t-3xl bg-background flex flex-col">
        <div className="p-4 flex items-center justify-between border-b border-border/50">
          <span className="w-9" />
          <h3 className="text-[16px] font-semibold flex items-center gap-1.5"><Star className="w-4 h-4 text-primary" /> Mejores amigos</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-3">
          <div className="flex items-center gap-2 h-10 px-3 rounded-2xl bg-muted/60">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar"
              className="flex-1 bg-transparent outline-none text-[14px] allow-select" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-8 space-y-1">
          {loading && <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}
          {!loading && !filtered.length && (
            <p className="py-10 text-center text-[13px] text-muted-foreground">Sigue a más personas para añadirlas.</p>
          )}
          {filtered.map((p) => (
            <button key={p.id} onClick={() => toggle(p.id)} className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-muted/40">
              <img src={p.avatar_url ?? "/placeholder.svg"} alt="" className="w-10 h-10 rounded-full object-cover" />
              <span className="flex-1 text-left">
                <span className="block text-[14px] font-medium">{p.full_name ?? p.username}</span>
                <span className="block text-[12px] text-muted-foreground">@{p.username}</span>
              </span>
              <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${friends.includes(p.id) ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
                {friends.includes(p.id) && <Star className="w-3 h-3 text-primary-foreground" />}
              </span>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BestFriendsSheet;