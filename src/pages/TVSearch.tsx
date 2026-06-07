import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSpatialNavigation } from "@/hooks/useSpatialNavigation";
import { ArrowLeft, Search } from "lucide-react";

const KEYS = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"," ","⌫"];

const TVSearch = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  useSpatialNavigation(true);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!q.trim()) { setResults([]); return; }
      const { data } = await supabase
        .from("books")
        .select("id,title,cover_url,genre")
        .eq("status", "published")
        .ilike("title", `%${q}%`)
        .limit(18);
      setResults(data || []);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const press = (k: string) => {
    if (k === "⌫") setQ((s) => s.slice(0, -1));
    else setQ((s) => (s + k).slice(0, 40));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#13072a] to-[#1f0a3d] text-white p-12">
      <div className="flex items-center gap-6 mb-8">
        <button
          data-tv-focusable
          onClick={() => navigate(-1)}
          className="p-4 rounded-2xl bg-white/5 border border-white/10 outline-none focus:bg-white/15 focus:border-violet-400 focus:scale-105 transition-all"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 flex items-center gap-4 px-6 py-5 rounded-2xl bg-white/5 border border-white/10">
          <Search className="w-6 h-6 text-white/50" />
          <span className="text-2xl tracking-wide">{q || <span className="text-white/30">Escribe con el mando…</span>}</span>
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-10">
        {/* On-screen keyboard */}
        <div className="grid grid-cols-7 gap-2 w-[420px]">
          {KEYS.map((k) => (
            <button
              key={k}
              data-tv-focusable
              onClick={() => press(k)}
              className="h-14 rounded-xl bg-white/5 border border-white/10 text-lg font-medium outline-none transition-all focus:bg-violet-500 focus:border-violet-300 focus:scale-110"
            >
              {k}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="grid grid-cols-4 gap-5 content-start">
          {results.map((b) => (
            <button
              key={b.id}
              data-tv-focusable
              onClick={() => navigate(`/tv/book/${b.id}`)}
              className="text-left outline-none group"
            >
              <div className="aspect-[2/3] rounded-2xl overflow-hidden bg-white/5 border border-white/10 transition-all group-focus:scale-[1.06] group-focus:border-violet-400 group-focus:shadow-[0_0_30px_rgba(167,139,250,0.6)]">
                {b.cover_url && <img src={b.cover_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <p className="mt-2 text-base line-clamp-1">{b.title}</p>
              <p className="text-sm text-white/50 line-clamp-1">{b.genre}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TVSearch;