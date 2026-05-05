import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Flame, Calendar, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { IOSHeader } from "@/components/ios/IOSHeader";
import IOSBottomNav from "@/components/navigation/IOSBottomNav";

interface Medal {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  description: string;
  rarity: string;
  display_order: number;
}

interface EarnedMedal {
  id: string;
  medal_id: string;
  month: number;
  year: number;
  days_count: number;
  awarded_at: string;
}

interface Streak {
  current_streak: number;
  longest_streak: number;
  total_days: number;
  last_check_in: string | null;
}

const rarityStyles: Record<string, string> = {
  common: "from-slate-400/20 to-slate-500/10 border-slate-400/30",
  rare: "from-blue-400/25 to-blue-500/10 border-blue-400/40",
  epic: "from-violet-400/25 to-fuchsia-500/15 border-violet-400/40",
  legendary: "from-amber-400/30 to-orange-500/20 border-amber-400/50",
};

const rarityLabel: Record<string, string> = {
  common: "Común",
  rare: "Rara",
  epic: "Épica",
  legendary: "Legendaria",
};

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const MedalsPage = () => {
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<Medal[]>([]);
  const [earned, setEarned] = useState<EarnedMedal[]>([]);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [daysThisMonth, setDaysThisMonth] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const now = new Date();
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

      const [c, e, s, d] = await Promise.all([
        (supabase as any).from("monthly_medals").select("*").order("display_order"),
        (supabase as any).from("user_monthly_medals").select("*").eq("user_id", user.id).order("awarded_at", { ascending: false }),
        (supabase as any).from("user_streaks").select("*").eq("user_id", user.id).maybeSingle(),
        (supabase as any).from("daily_check_ins").select("check_in_date").eq("user_id", user.id).gte("check_in_date", startMonth),
      ]);

      setCatalog(c.data || []);
      setEarned(e.data || []);
      setStreak(s.data || { current_streak: 0, longest_streak: 0, total_days: 0, last_check_in: null });
      setDaysThisMonth((d.data || []).length);
      setLoading(false);
    };
    load();
  }, []);

  const earnedIds = new Set(earned.map((e) => e.medal_id));
  const earnedByMedal = new Map(earned.map((e) => [e.medal_id, e]));
  const goal = 20;
  const progressPct = Math.min(100, (daysThisMonth / goal) * 100);

  return (
    <div className="min-h-screen bg-background pb-28">
      <IOSHeader title="Medallas" large />

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      ) : (
        <div className="px-4 space-y-5 pt-2">
          {/* Streak card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="liquid-glass rounded-3xl p-5 border border-border/50"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center shadow-lg">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-[12px] text-muted-foreground font-medium">Tu racha diaria</p>
                <h2 className="text-[26px] font-bold leading-tight">
                  {streak?.current_streak || 0} {streak?.current_streak === 1 ? "día" : "días"}
                </h2>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-[11px] text-muted-foreground">Mejor racha</p>
                <p className="text-[18px] font-bold">{streak?.longest_streak || 0} días</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-[11px] text-muted-foreground">Total conexiones</p>
                <p className="text-[18px] font-bold">{streak?.total_days || 0}</p>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Medalla de este mes
                </span>
                <span className="text-[12px] font-bold text-primary">{daysThisMonth}/{goal}</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full bg-gradient-to-r from-primary to-violet-500 rounded-full"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                {daysThisMonth >= goal
                  ? "🎉 ¡Ya tienes la medalla del mes!"
                  : `Conéctate ${goal - daysThisMonth} días más para ganar la medalla.`}
              </p>
            </div>
          </motion.div>

          {/* Earned section */}
          <div>
            <h3 className="text-[15px] font-bold mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Mis medallas ({earned.length})
            </h3>
            {earned.length === 0 ? (
              <div className="bg-card border border-dashed border-border rounded-2xl p-6 text-center">
                <p className="text-[13px] text-muted-foreground">
                  Aún no tienes medallas. ¡Sigue conectándote para ganar la primera!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5">
                {earned.map((e) => {
                  const m = catalog.find((c) => c.id === e.medal_id);
                  if (!m) return null;
                  return (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`relative rounded-2xl p-3 bg-gradient-to-br ${rarityStyles[m.rarity] || rarityStyles.common} border text-center`}
                    >
                      <div className="text-[36px] mb-1">{m.emoji}</div>
                      <p className="text-[11px] font-bold leading-tight line-clamp-2">{m.name}</p>
                      <p className="text-[9.5px] text-muted-foreground mt-0.5">
                        {monthNames[e.month - 1]} {e.year}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Catalog */}
          <div>
            <h3 className="text-[15px] font-bold mb-3">Catálogo completo (32)</h3>
            <div className="grid grid-cols-3 gap-2.5">
              {catalog.map((m) => {
                const owned = earnedIds.has(m.id);
                return (
                  <div
                    key={m.id}
                    className={`relative rounded-2xl p-3 border text-center transition-all ${
                      owned
                        ? `bg-gradient-to-br ${rarityStyles[m.rarity] || rarityStyles.common}`
                        : "bg-muted/30 border-border/40 opacity-70"
                    }`}
                  >
                    <div className={`text-[32px] mb-1 ${owned ? "" : "grayscale"}`}>{m.emoji}</div>
                    <p className="text-[11px] font-bold leading-tight line-clamp-2">{m.name}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{rarityLabel[m.rarity]}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <IOSBottomNav />
    </div>
  );
};

export default MedalsPage;