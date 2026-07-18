import { useEffect, useState } from "react";
import { IOSHeader } from "@/components/ios/IOSHeader";
import BackButton from "@/components/navigation/BackButton";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Award, MapPin, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Ambassador = { id: string; user_id: string; tier: string; points: number; region: string | null; bio: string | null; profile?: { username: string; display_name: string; avatar_url: string } };
type Task = { id: string; title: string; description: string | null; points_reward: number };

const TIER_COLORS: Record<string, string> = {
  bronze: "from-amber-700 to-orange-800",
  silver: "from-slate-300 to-slate-500",
  gold: "from-yellow-400 to-amber-500",
  diamond: "from-cyan-300 via-sky-400 to-blue-500",
};

const Ambassadors = () => {
  const [list, setList] = useState<Ambassador[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const [mine, setMine] = useState<Ambassador | null>(null);
  const [region, setRegion] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);
  useEffect(() => { load(); }, [uid]);

  const load = async () => {
    const [l, t] = await Promise.all([
      supabase.from("ambassadors").select("*, profile:profiles!ambassadors_user_id_fkey(username, display_name, avatar_url)").eq("is_active", true).order("points", { ascending: false }).limit(50),
      supabase.from("ambassador_tasks").select("*").eq("is_active", true),
    ]);
    setList((l.data ?? []) as any);
    setTasks((t.data ?? []) as Task[]);
    if (uid) setMine(((l.data ?? []) as any).find((a: Ambassador) => a.user_id === uid) ?? null);
  };

  const join = async () => {
    if (!uid) return;
    const { error } = await supabase.from("ambassadors").insert({ user_id: uid, region: region || null, bio: bio || null });
    if (error) return toast.error(error.message);
    toast.success("¡Bienvenido al programa!");
    load();
  };

  return (
    <div className="min-h-screen pb-safe bg-background">
      <IOSHeader title="Embajadores" leftAction={<BackButton />} />
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {!mine && uid && (
          <div className="liquid-glass rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Únete al programa</h2>
            </div>
            <p className="text-xs text-muted-foreground">Ayuda a crecer la comunidad de Lettora y gana beneficios exclusivos.</p>
            <input value={region} onChange={e => setRegion(e.target.value)} placeholder="Región (opcional)" className="w-full bg-muted/60 rounded-xl px-3 py-2 text-sm" />
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2} placeholder="¿Por qué quieres ser embajador?" className="w-full bg-muted/60 rounded-xl px-3 py-2 text-sm" />
            <button onClick={join} className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">Postularme</button>
          </div>
        )}

        {mine && (
          <div className={`rounded-2xl p-[2px] bg-gradient-to-br ${TIER_COLORS[mine.tier]}`}>
            <div className="rounded-2xl bg-card p-4">
              <p className="text-xs uppercase text-muted-foreground">Mi rango</p>
              <h2 className="text-2xl font-bold capitalize">{mine.tier}</h2>
              <p className="text-sm text-muted-foreground mt-1">{mine.points} puntos</p>
            </div>
          </div>
        )}

        {tasks.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1"><Sparkles className="w-4 h-4" /> Tareas activas</h3>
            <div className="space-y-2">
              {tasks.map(t => (
                <div key={t.id} className="liquid-glass rounded-2xl p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{t.title}</p>
                      {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                    </div>
                    <span className="text-xs bg-primary/15 text-primary px-2 py-1 rounded-full">+{t.points_reward} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold mb-2">Ranking</h3>
          <div className="space-y-2">
            {list.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                className="liquid-glass rounded-2xl p-3 flex items-center gap-3">
                <div className="w-8 text-center font-bold text-muted-foreground">#{i + 1}</div>
                {a.profile?.avatar_url ? (
                  <img src={a.profile.avatar_url} className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{a.profile?.display_name ?? a.profile?.username ?? "Embajador"}</p>
                  {a.region && <p className="text-[11px] text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{a.region}</p>}
                </div>
                <div className={`text-xs font-bold px-2 py-1 rounded-full bg-gradient-to-br ${TIER_COLORS[a.tier]} text-white capitalize`}>{a.tier}</div>
                <div className="text-sm font-semibold">{a.points}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Ambassadors;