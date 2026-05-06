import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Flame, Calendar, Trophy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { IOSHeader } from "@/components/ios/IOSHeader";
import IOSBottomNav from "@/components/navigation/IOSBottomNav";
import { MedalIcon } from "@/components/medals/MedalIcon";
import { ShareAppButton } from "@/components/ShareAppButton";

interface Medal {
  id: string;
  slug: string;
  name: string;
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

const rarityLabel: Record<string, string> = {
  common: "Común", rare: "Rara", epic: "Épica", legendary: "Legendaria",
};

const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const MedalsPage = () => {
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<Medal[]>([]);
  const [earned, setEarned] = useState<EarnedMedal[]>([]);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [checkInDates, setCheckInDates] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Medal | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Trigger today's check-in (idempotent)
      try { await (supabase as any).rpc("record_daily_check_in"); } catch {}

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
      setCheckInDates(new Set((d.data || []).map((r: any) => r.check_in_date)));
      setLoading(false);
    };
    load();
  }, []);

  const earnedIds = new Set(earned.map((e) => e.medal_id));
  const goal = 20;
  const daysThisMonth = checkInDates.size;
  const progressPct = Math.min(100, (daysThisMonth / goal) * 100);

  // Calendar grid for current month
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0

  const calendarCells: { day: number | null; checked: boolean; isToday: boolean }[] = [];
  for (let i = 0; i < firstWeekday; i++) calendarCells.push({ day: null, checked: false, isToday: false });
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    calendarCells.push({
      day: d,
      checked: checkInDates.has(iso),
      isToday: d === today.getDate(),
    });
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <IOSHeader title="Medallas" large rightAction={<ShareAppButton variant="icon" />} />

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

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-muted/50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Mejor</p>
                <p className="text-[17px] font-bold">{streak?.longest_streak || 0}</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
                <p className="text-[17px] font-bold">{streak?.total_days || 0}</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Mes</p>
                <p className="text-[17px] font-bold">{daysThisMonth}</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Medalla de {monthNames[month]}
                </span>
                <span className="text-[12px] font-bold text-primary">{daysThisMonth}/{goal}</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 rounded-full"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                {daysThisMonth >= goal
                  ? "🎉 ¡Ya tienes la medalla del mes!"
                  : `Conéctate ${goal - daysThisMonth} días más para ganarla.`}
              </p>
            </div>
          </motion.div>

          {/* Monthly calendar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="liquid-glass rounded-3xl p-4 border border-border/50"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-bold">{monthNames[month]} {year}</h3>
              <span className="text-[11px] text-muted-foreground">Días conectado</span>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {["L","M","X","J","V","S","D"].map((d) => (
                <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((c, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-lg flex items-center justify-center text-[11px] font-semibold relative ${
                    c.day === null
                      ? ""
                      : c.checked
                      ? "bg-gradient-to-br from-primary to-violet-500 text-white shadow-sm"
                      : c.isToday
                      ? "bg-primary/15 text-primary border border-primary/40"
                      : "bg-muted/40 text-muted-foreground"
                  }`}
                >
                  {c.day}
                  {c.checked && <Check className="w-2.5 h-2.5 absolute top-0.5 right-0.5" />}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Earned */}
          <div>
            <h3 className="text-[15px] font-bold mb-3 flex items-center gap-2 px-1">
              <Trophy className="w-4 h-4 text-amber-500" />
              Mis medallas ({earned.length})
            </h3>
            {earned.length === 0 ? (
              <div className="bg-card border border-dashed border-border rounded-2xl p-6 text-center">
                <p className="text-[13px] text-muted-foreground">
                  Aún no tienes medallas. ¡Sigue conectándote!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {earned.map((e) => {
                  const m = catalog.find((c) => c.id === e.medal_id);
                  if (!m) return null;
                  return (
                    <motion.button
                      key={e.id}
                      onClick={() => setSelected(m)}
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileTap={{ scale: 0.94 }}
                      className="liquid-glass rounded-2xl p-3 border border-border/40 text-center"
                    >
                      <div className="flex justify-center mb-1.5">
                        <MedalIcon rarity={m.rarity} index={m.display_order} size={56} />
                      </div>
                      <p className="text-[11px] font-bold leading-tight line-clamp-2">{m.name}</p>
                      <p className="text-[9.5px] text-muted-foreground mt-0.5">
                        {monthNames[e.month - 1]} {e.year}
                      </p>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Catalog */}
          <div>
            <h3 className="text-[15px] font-bold mb-3 px-1">Catálogo (32)</h3>
            <div className="grid grid-cols-3 gap-3">
              {catalog.map((m) => {
                const owned = earnedIds.has(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelected(m)}
                    className={`rounded-2xl p-3 border text-center transition-all ${
                      owned ? "bg-card border-border/50" : "bg-muted/20 border-border/30"
                    } active:scale-[0.96]`}
                  >
                    <div className="flex justify-center mb-1.5">
                      <MedalIcon rarity={m.rarity} index={m.display_order} size={52} locked={!owned} />
                    </div>
                    <p className="text-[11px] font-bold leading-tight line-clamp-2">{m.name}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{rarityLabel[m.rarity]}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Detail sheet */}
      {selected && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end justify-center"
          onClick={() => setSelected(null)}
        >
          <motion.div
            initial={{ y: 400 }} animate={{ y: 0 }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md liquid-glass rounded-t-[28px] p-6 pb-10 border-t border-white/15 text-center"
          >
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-5" />
            <div className="flex justify-center mb-3">
              <MedalIcon rarity={selected.rarity} index={selected.display_order} size={120} locked={!earnedIds.has(selected.id)} />
            </div>
            <h2 className="text-[22px] font-bold">{selected.name}</h2>
            <p className="text-[13px] text-primary font-semibold mb-2">{rarityLabel[selected.rarity]}</p>
            <p className="text-[14px] text-muted-foreground">{selected.description}</p>
            <p className="text-[11px] text-muted-foreground mt-4">
              {earnedIds.has(selected.id) ? "✅ Ya la posees" : "Conéctate 20 días en el mes para desbloquearla."}
            </p>
          </motion.div>
        </div>
      )}

      <IOSBottomNav />
    </div>
  );
};

export default MedalsPage;
