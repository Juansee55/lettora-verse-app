import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Globe2, BookOpen, Users2, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { IOSHeader } from "@/components/ios/IOSHeader";
import BackButton from "@/components/navigation/BackButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Universe = {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  is_public: boolean;
  owner_id: string;
};

const Universes = () => {
  const nav = useNavigate();
  const [items, setItems] = useState<Universe[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("universes").select("*").order("created_at", { ascending: false });
    setItems((data ?? []) as Universe[]);
    setLoading(false);
  };

  const create = async () => {
    if (!name.trim() || !uid) return;
    const { error } = await supabase.from("universes").insert({ name: name.trim(), description: desc || null, owner_id: uid });
    if (error) return toast.error(error.message);
    toast.success("Universo creado");
    setName(""); setDesc(""); setCreating(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar universo?")) return;
    const { error } = await supabase.from("universes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="min-h-screen pb-safe bg-background">
      <IOSHeader
        title="Universos"
        leftAction={<BackButton />}
        rightAction={<button onClick={() => setCreating(v => !v)} className="text-primary"><Plus className="w-5 h-5" /></button>}
      />
      <div className="p-4 space-y-3 max-w-2xl mx-auto">
        {creating && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="liquid-glass rounded-2xl p-4 space-y-3">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del universo" className="w-full bg-muted/60 rounded-xl px-3 py-2 text-sm" />
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descripción (opcional)" rows={2} className="w-full bg-muted/60 rounded-xl px-3 py-2 text-sm" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setCreating(false)} className="px-4 py-2 text-sm text-muted-foreground">Cancelar</button>
              <button onClick={create} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">Crear</button>
            </div>
          </motion.div>
        )}

        {!loading && items.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Globe2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Aún no hay universos. Crea el primero.</p>
          </div>
        )}

        {items.map(u => (
          <motion.div key={u.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            onClick={() => nav(`/universes/${u.id}`)}
            className="liquid-glass rounded-2xl p-4 flex items-center gap-3 cursor-pointer">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white">
              <Globe2 className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{u.name}</h3>
              {u.description && <p className="text-xs text-muted-foreground truncate">{u.description}</p>}
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">{u.is_public ? "Público" : "Privado"}</p>
            </div>
            {u.owner_id === uid && (
              <button onClick={(e) => { e.stopPropagation(); remove(u.id); }} className="p-2 text-destructive/70">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};
export default Universes;