import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Users, TrendingUp, Smartphone, BarChart3, Loader2, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Metrics {
  dau: number;
  wau: number;
  mau: number;
  newUsers7d: number;
  newUsers30d: number;
  retention7d: number;
  sectionCounts: Record<string, number>;
  platformCounts: Record<string, number>;
  totalEvents: number;
}

const iso = (d: Date) => d.toISOString();

const AnalyticsPanel = () => {
  const [m, setM] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const now = new Date();
      const d1 = new Date(now.getTime() - 24 * 3600 * 1000);
      const d7 = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
      const d30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

      // Active users via user_sessions (last_seen)
      const [dauR, wauR, mauR] = await Promise.all([
        supabase.from("user_sessions").select("user_id", { count: "exact", head: false }).gte("last_seen", iso(d1)),
        supabase.from("user_sessions").select("user_id", { count: "exact", head: false }).gte("last_seen", iso(d7)),
        supabase.from("user_sessions").select("user_id", { count: "exact", head: false }).gte("last_seen", iso(d30)),
      ]);
      const uniq = (rows: any[] | null) => new Set((rows || []).map(r => r.user_id)).size;
      const dau = uniq(dauR.data);
      const wau = uniq(wauR.data);
      const mau = uniq(mauR.data);

      // New users
      const [n7, n30] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", iso(d7)),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", iso(d30)),
      ]);

      // Retention: users created 7-14d ago who returned in last 7d
      const d14 = new Date(now.getTime() - 14 * 24 * 3600 * 1000);
      const { data: cohort } = await supabase
        .from("profiles")
        .select("id")
        .gte("created_at", iso(d14))
        .lt("created_at", iso(d7));
      const cohortIds = (cohort || []).map((c: any) => c.id);
      let retention7d = 0;
      if (cohortIds.length > 0) {
        const { data: returned } = await supabase
          .from("user_sessions")
          .select("user_id")
          .in("user_id", cohortIds)
          .gte("last_seen", iso(d7));
        const uniqRet = new Set((returned || []).map((r: any) => r.user_id)).size;
        retention7d = Math.round((uniqRet / cohortIds.length) * 100);
      }

      // Section usage (last 7d)
      const { data: events } = await supabase
        .from("analytics_events" as any)
        .select("section")
        .gte("created_at", iso(d7))
        .limit(10000) as any;
      const sectionCounts: Record<string, number> = {};
      (events || []).forEach((e: any) => {
        sectionCounts[e.section] = (sectionCounts[e.section] || 0) + 1;
      });

      // Platform counts (last 30d)
      const { data: sessions } = await supabase
        .from("user_sessions")
        .select("platform")
        .gte("last_seen", iso(d30))
        .limit(5000);
      const platformCounts: Record<string, number> = {};
      (sessions || []).forEach((s: any) => {
        const p = s.platform || "Web";
        platformCounts[p] = (platformCounts[p] || 0) + 1;
      });

      setM({
        dau, wau, mau,
        newUsers7d: n7.count || 0,
        newUsers30d: n30.count || 0,
        retention7d,
        sectionCounts,
        platformCounts,
        totalEvents: events?.length || 0,
      });
      setLoading(false);
    };
    load();
  }, []);

  const sortedSections = useMemo(() => {
    if (!m) return [];
    return Object.entries(m.sectionCounts).sort((a, b) => b[1] - a[1]);
  }, [m]);
  const sortedPlatforms = useMemo(() => {
    if (!m) return [];
    return Object.entries(m.platformCounts).sort((a, b) => b[1] - a[1]);
  }, [m]);

  const maxSection = sortedSections[0]?.[1] || 1;
  const totalPlatform = sortedPlatforms.reduce((a, [, v]) => a + v, 0) || 1;

  if (loading || !m) {
    return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const Card = ({ icon: Icon, label, value, sub, color }: any) => (
    <div className="bg-card rounded-2xl border border-border/50 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <p className="text-[12px] text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
          👥 Usuarios activos
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <Card icon={Activity} label="DAU" value={m.dau} sub="Últimas 24h" color="bg-emerald-500/15 text-emerald-500" />
          <Card icon={Users} label="WAU" value={m.wau} sub="Últimos 7 días" color="bg-blue-500/15 text-blue-500" />
          <Card icon={Users} label="MAU" value={m.mau} sub="Últimos 30 días" color="bg-purple-500/15 text-purple-500" />
        </div>
      </div>

      <div>
        <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
          📈 Crecimiento y retención
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <Card icon={TrendingUp} label="Nuevos 7d" value={m.newUsers7d} color="bg-amber-500/15 text-amber-500" />
          <Card icon={TrendingUp} label="Nuevos 30d" value={m.newUsers30d} color="bg-orange-500/15 text-orange-500" />
          <Card icon={TrendingUp} label="Retención" value={`${m.retention7d}%`} sub="Cohorte 7-14d" color="bg-rose-500/15 text-rose-500" />
        </div>
      </div>

      <div>
        <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
          <BarChart3 className="inline w-3.5 h-3.5 mr-1" /> Uso por sección (últimos 7 días · {m.totalEvents} eventos)
        </h3>
        <div className="bg-card rounded-2xl border border-border/50 p-3 space-y-2">
          {sortedSections.length === 0 ? (
            <p className="text-[13px] text-muted-foreground text-center py-4">Sin datos aún — navega la app para generar eventos.</p>
          ) : sortedSections.map(([section, count], i) => (
            <motion.div
              key={section}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <div className="flex items-center justify-between text-[13px] mb-1">
                <span className="capitalize font-medium">{section}</span>
                <span className="text-muted-foreground">{count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(count / maxSection) * 100}%` }}
                  transition={{ duration: 0.6, delay: i * 0.03 }}
                  className="h-full bg-gradient-to-r from-primary to-primary/60"
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
          <Smartphone className="inline w-3.5 h-3.5 mr-1" /> Dispositivos y plataformas
        </h3>
        <div className="bg-card rounded-2xl border border-border/50 p-3 space-y-2">
          {sortedPlatforms.length === 0 ? (
            <p className="text-[13px] text-muted-foreground text-center py-4">Sin sesiones registradas.</p>
          ) : sortedPlatforms.map(([platform, count]) => {
            const pct = Math.round((count / totalPlatform) * 100);
            return (
              <div key={platform} className="flex items-center justify-between text-[13px]">
                <span className="font-medium">{platform}</span>
                <span className="text-muted-foreground">{count} · {pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel;