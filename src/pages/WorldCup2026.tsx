import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Trophy, Radio, MapPin, CalendarDays, Search, Sparkles } from "lucide-react";
import IOSBottomNav from "@/components/navigation/IOSBottomNav";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * FIFA World Cup 2026 — United States 🇺🇸 · Canada 🇨🇦 · Mexico 🇲🇽
 * 48 selecciones, 12 grupos de 4. UI animada estilo Liquid Glass.
 */

interface Team {
  name: string;
  code: string;
  flag: string;
  confederation: string;
  status: "host" | "qualified" | "playoff";
}

const TEAMS: Team[] = [
  // Anfitriones
  { name: "Estados Unidos", code: "USA", flag: "🇺🇸", confederation: "CONCACAF", status: "host" },
  { name: "Canadá", code: "CAN", flag: "🇨🇦", confederation: "CONCACAF", status: "host" },
  { name: "México", code: "MEX", flag: "🇲🇽", confederation: "CONCACAF", status: "host" },
  // UEFA
  { name: "Inglaterra", code: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", confederation: "UEFA", status: "qualified" },
  { name: "Francia", code: "FRA", flag: "🇫🇷", confederation: "UEFA", status: "qualified" },
  { name: "Alemania", code: "GER", flag: "🇩🇪", confederation: "UEFA", status: "qualified" },
  { name: "España", code: "ESP", flag: "🇪🇸", confederation: "UEFA", status: "qualified" },
  { name: "Portugal", code: "POR", flag: "🇵🇹", confederation: "UEFA", status: "qualified" },
  { name: "Países Bajos", code: "NED", flag: "🇳🇱", confederation: "UEFA", status: "qualified" },
  { name: "Italia", code: "ITA", flag: "🇮🇹", confederation: "UEFA", status: "playoff" },
  { name: "Bélgica", code: "BEL", flag: "🇧🇪", confederation: "UEFA", status: "qualified" },
  { name: "Croacia", code: "CRO", flag: "🇭🇷", confederation: "UEFA", status: "qualified" },
  { name: "Suiza", code: "SUI", flag: "🇨🇭", confederation: "UEFA", status: "qualified" },
  { name: "Austria", code: "AUT", flag: "🇦🇹", confederation: "UEFA", status: "qualified" },
  { name: "Noruega", code: "NOR", flag: "🇳🇴", confederation: "UEFA", status: "qualified" },
  // CONMEBOL
  { name: "Argentina", code: "ARG", flag: "🇦🇷", confederation: "CONMEBOL", status: "qualified" },
  { name: "Brasil", code: "BRA", flag: "🇧🇷", confederation: "CONMEBOL", status: "qualified" },
  { name: "Uruguay", code: "URU", flag: "🇺🇾", confederation: "CONMEBOL", status: "qualified" },
  { name: "Colombia", code: "COL", flag: "🇨🇴", confederation: "CONMEBOL", status: "qualified" },
  { name: "Ecuador", code: "ECU", flag: "🇪🇨", confederation: "CONMEBOL", status: "qualified" },
  { name: "Paraguay", code: "PAR", flag: "🇵🇾", confederation: "CONMEBOL", status: "qualified" },
  // CONCACAF
  { name: "Panamá", code: "PAN", flag: "🇵🇦", confederation: "CONCACAF", status: "qualified" },
  { name: "Costa Rica", code: "CRC", flag: "🇨🇷", confederation: "CONCACAF", status: "playoff" },
  // CONMEBOL playoff
  { name: "Venezuela", code: "VEN", flag: "🇻🇪", confederation: "CONMEBOL", status: "playoff" },
  // AFC
  { name: "Japón", code: "JPN", flag: "🇯🇵", confederation: "AFC", status: "qualified" },
  { name: "Corea del Sur", code: "KOR", flag: "🇰🇷", confederation: "AFC", status: "qualified" },
  { name: "Australia", code: "AUS", flag: "🇦🇺", confederation: "AFC", status: "qualified" },
  { name: "Irán", code: "IRN", flag: "🇮🇷", confederation: "AFC", status: "qualified" },
  { name: "Arabia Saudita", code: "KSA", flag: "🇸🇦", confederation: "AFC", status: "qualified" },
  { name: "Qatar", code: "QAT", flag: "🇶🇦", confederation: "AFC", status: "qualified" },
  { name: "Uzbekistán", code: "UZB", flag: "🇺🇿", confederation: "AFC", status: "qualified" },
  { name: "Jordania", code: "JOR", flag: "🇯🇴", confederation: "AFC", status: "qualified" },
  // CAF
  { name: "Marruecos", code: "MAR", flag: "🇲🇦", confederation: "CAF", status: "qualified" },
  { name: "Senegal", code: "SEN", flag: "🇸🇳", confederation: "CAF", status: "qualified" },
  { name: "Egipto", code: "EGY", flag: "🇪🇬", confederation: "CAF", status: "qualified" },
  { name: "Argelia", code: "ALG", flag: "🇩🇿", confederation: "CAF", status: "qualified" },
  { name: "Túnez", code: "TUN", flag: "🇹🇳", confederation: "CAF", status: "qualified" },
  { name: "Ghana", code: "GHA", flag: "🇬🇭", confederation: "CAF", status: "qualified" },
  { name: "Costa de Marfil", code: "CIV", flag: "🇨🇮", confederation: "CAF", status: "qualified" },
  { name: "Nigeria", code: "NGA", flag: "🇳🇬", confederation: "CAF", status: "playoff" },
  // OFC
  { name: "Nueva Zelanda", code: "NZL", flag: "🇳🇿", confederation: "OFC", status: "qualified" },
];

const CONFEDERATIONS = ["Todas", "UEFA", "CONMEBOL", "CONCACAF", "AFC", "CAF", "OFC"] as const;

const HOST_CITIES = [
  "Nueva York / Nueva Jersey", "Los Ángeles", "Dallas", "Atlanta", "Miami", "Seattle",
  "Boston", "Filadelfia", "Kansas City", "San Francisco", "Houston",
  "Toronto", "Vancouver", "Ciudad de México", "Guadalajara", "Monterrey",
];

interface LiveMatch {
  id: string;
  home: string;
  away: string;
  homeScore: string;
  awayScore: string;
  status: string;
  league: string;
  date: string;
}

const useLiveMatches = () => {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // TheSportsDB free livescore endpoint (key 123 = test)
        const res = await fetch("https://www.thesportsdb.com/api/v2/json/livescore/soccer", {
          headers: { "X-API-KEY": "123" },
        }).catch(() => null);
        let data: any = null;
        if (res && res.ok) data = await res.json().catch(() => null);
        // Fallback: latest soccer events
        if (!data || !data.livescore) {
          const r2 = await fetch("https://www.thesportsdb.com/api/v1/json/3/latestsoccer.php");
          if (r2.ok) data = await r2.json();
        }
        if (cancelled) return;
        const list: any[] = data?.livescore || data?.teams?.Match || data?.events || [];
        const parsed: LiveMatch[] = list.slice(0, 20).map((m: any, i: number) => ({
          id: String(m.idEvent || m.idLiveScore || i),
          home: m.strHomeTeam || m.strHome || "—",
          away: m.strAwayTeam || m.strAway || "—",
          homeScore: String(m.intHomeScore ?? m.intHome ?? "-"),
          awayScore: String(m.intAwayScore ?? m.intAway ?? "-"),
          status: m.strStatus || m.strProgress || m.strTime || "LIVE",
          league: m.strLeague || m.strSport || "Fútbol",
          date: m.dateEvent || m.updated || "",
        }));
        setMatches(parsed);
      } catch (e: any) {
        if (!cancelled) setError("No se pudieron cargar los partidos en vivo");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return { matches, loading, error };
};

const WorldCup2026 = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<(typeof CONFEDERATIONS)[number]>("Todas");
  const [query, setQuery] = useState("");
  const { matches, loading, error } = useLiveMatches();

  // Countdown al kickoff: 11 junio 2026
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const kickoff = useMemo(() => new Date("2026-06-11T20:00:00-05:00").getTime(), []);
  const diff = Math.max(0, kickoff - now);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);

  const filtered = useMemo(() => {
    return TEAMS.filter((t) => {
      if (filter !== "Todas" && t.confederation !== filter) return false;
      if (query && !t.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [filter, query]);

  return (
    <div className="min-h-screen bg-background pb-32 overflow-hidden relative">
      {/* Fondo animado */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute -top-32 -left-20 w-[420px] h-[420px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(220 90% 55% / 0.35), transparent 70%)" }}
          animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/3 -right-24 w-[380px] h-[380px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(0 85% 55% / 0.3), transparent 70%)" }}
          animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-10 left-1/3 w-[360px] h-[360px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(140 70% 50% / 0.28), transparent 70%)" }}
          animate={{ x: [0, 40, 0], y: [0, -40, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-2xl bg-background/60 border-b border-border/40">
        <div className="flex items-center gap-3 px-4 h-14 max-w-md mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full active:bg-muted/60">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-[17px] font-bold leading-tight">Mundial 2026</h1>
            <p className="text-[11px] text-muted-foreground">USA · CAN · MEX</p>
          </div>
          <Trophy className="w-5 h-5 text-primary" />
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-6">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl overflow-hidden p-5 border border-white/10"
          style={{
            background: "linear-gradient(135deg, hsl(220 90% 25%), hsl(280 70% 30%) 50%, hsl(0 80% 35%))",
          }}
        >
          <motion.div
            className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span className="text-[11px] uppercase tracking-[0.2em] text-white/80 font-bold">FIFA World Cup</span>
            </div>
            <h2 className="text-3xl font-black text-white leading-none">2026</h2>
            <p className="text-white/80 text-sm mt-1">48 selecciones · 16 sedes · 104 partidos</p>

            {/* Countdown */}
            <div className="grid grid-cols-4 gap-2 mt-5">
              {[
                { label: "Días", value: days },
                { label: "Hrs", value: hours },
                { label: "Min", value: minutes },
                { label: "Seg", value: seconds },
              ].map((b) => (
                <div key={b.label} className="rounded-2xl bg-white/15 backdrop-blur-md p-2 text-center border border-white/10">
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={b.value}
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 10, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="text-xl font-black text-white tabular-nums"
                    >
                      {String(b.value).padStart(2, "0")}
                    </motion.div>
                  </AnimatePresence>
                  <div className="text-[9px] uppercase tracking-wider text-white/70 font-semibold">{b.label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Resultados en vivo */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <motion.div
                className="w-2 h-2 rounded-full bg-red-500"
                animate={{ opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
              <h3 className="text-[15px] font-bold">En vivo ahora</h3>
            </div>
            <Radio className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            {loading && (
              <div className="rounded-2xl bg-muted/40 backdrop-blur p-6 text-center text-sm text-muted-foreground">
                Cargando partidos…
              </div>
            )}
            {!loading && matches.length === 0 && (
              <div className="rounded-2xl bg-muted/40 backdrop-blur p-6 text-center text-sm text-muted-foreground">
                {error || "No hay partidos en vivo en este momento. Vuelve pronto."}
              </div>
            )}
            <AnimatePresence initial={false}>
              {matches.map((m, idx) => (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ delay: idx * 0.04 }}
                  className="rounded-2xl bg-card/70 backdrop-blur-xl border border-border/50 p-3 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold truncate max-w-[60%]">
                      {m.league}
                    </span>
                    <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      {m.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 text-right text-sm font-semibold truncate">{m.home}</div>
                    <div className="px-3 py-1 rounded-xl bg-primary/10 font-black text-base tabular-nums">
                      {m.homeScore} - {m.awayScore}
                    </div>
                    <div className="flex-1 text-sm font-semibold truncate">{m.away}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>

        {/* Sedes */}
        <section>
          <h3 className="text-[15px] font-bold mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Sedes anfitrionas
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {HOST_CITIES.map((city, i) => (
              <motion.div
                key={city}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex-shrink-0 px-3 py-2 rounded-xl bg-card/70 backdrop-blur border border-border/50 text-xs font-medium whitespace-nowrap"
              >
                {city}
              </motion.div>
            ))}
          </div>
        </section>

        {/* Equipos */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-bold">Selecciones</h3>
            <span className="text-[11px] text-muted-foreground">{filtered.length} de {TEAMS.length}</span>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar selección…"
              className="pl-9 rounded-2xl bg-card/70 backdrop-blur border-border/50"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 mb-3 scrollbar-hide">
            {CONFEDERATIONS.map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={cn(
                  "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                  filter === c
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                    : "bg-card/70 backdrop-blur border border-border/50 text-muted-foreground"
                )}
              >
                {c}
              </button>
            ))}
          </div>

          <motion.div layout className="grid grid-cols-2 gap-2">
            <AnimatePresence>
              {filtered.map((t, i) => (
                <motion.div
                  key={t.code}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  whileTap={{ scale: 0.96 }}
                  className={cn(
                    "relative rounded-2xl p-3 border backdrop-blur-xl overflow-hidden",
                    t.status === "host"
                      ? "bg-gradient-to-br from-yellow-400/20 to-orange-500/10 border-yellow-400/40"
                      : t.status === "playoff"
                      ? "bg-card/70 border-dashed border-border"
                      : "bg-card/70 border-border/50"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl leading-none">{t.flag}</span>
                    {t.status === "host" && (
                      <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">
                        Anfitrión
                      </span>
                    )}
                    {t.status === "playoff" && (
                      <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                        Repechaje
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold leading-tight truncate">{t.name}</div>
                  <div className="text-[10px] text-muted-foreground">{t.confederation}</div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </section>

        {/* Info */}
        <section className="rounded-2xl bg-card/70 backdrop-blur-xl border border-border/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold">Calendario</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Inauguración: <strong className="text-foreground">11 de junio de 2026</strong> en el Estadio Azteca, Ciudad de México.
            Final: <strong className="text-foreground">19 de julio de 2026</strong> en el MetLife Stadium, Nueva York/Nueva Jersey.
          </p>
        </section>
      </div>

      <IOSBottomNav />
    </div>
  );
};

export default WorldCup2026;