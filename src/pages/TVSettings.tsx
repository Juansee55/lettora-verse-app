import { useNavigate } from "react-router-dom";
import { useSpatialNavigation } from "@/hooks/useSpatialNavigation";
import { ArrowLeft, Tv, Monitor } from "lucide-react";

const TVSettings = () => {
  const navigate = useNavigate();
  useSpatialNavigation(true);

  const enableTV = () => { localStorage.setItem("lettora_force_tv", "1"); navigate("/tv"); };
  const disableTV = () => { localStorage.setItem("lettora_force_tv", "0"); navigate("/home"); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#13072a] to-[#1f0a3d] text-white p-16">
      <button
        data-tv-focusable
        onClick={() => navigate(-1)}
        className="p-4 rounded-2xl bg-white/5 border border-white/10 outline-none focus:bg-white/15 focus:border-violet-400 focus:scale-105 transition-all mb-10"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>

      <h1 className="text-4xl font-bold mb-2">Ajustes de TV</h1>
      <p className="text-white/60 mb-10">Configura cómo se muestra Lettora en tu pantalla.</p>

      <div className="grid grid-cols-2 gap-6 max-w-3xl">
        <button
          data-tv-focusable
          onClick={enableTV}
          className="p-8 rounded-3xl bg-white/5 border border-white/10 outline-none transition-all focus:scale-[1.03] focus:border-violet-400 focus:shadow-[0_0_40px_rgba(167,139,250,0.5)] text-left"
        >
          <Tv className="w-10 h-10 mb-4 text-violet-300" />
          <h3 className="text-2xl font-semibold mb-2">Forzar modo TV</h3>
          <p className="text-white/60">Usa siempre la interfaz optimizada para Smart TV.</p>
        </button>
        <button
          data-tv-focusable
          onClick={disableTV}
          className="p-8 rounded-3xl bg-white/5 border border-white/10 outline-none transition-all focus:scale-[1.03] focus:border-violet-400 focus:shadow-[0_0_40px_rgba(167,139,250,0.5)] text-left"
        >
          <Monitor className="w-10 h-10 mb-4 text-fuchsia-300" />
          <h3 className="text-2xl font-semibold mb-2">Volver a la app móvil</h3>
          <p className="text-white/60">Desactiva el modo TV y usa la versión normal.</p>
        </button>
      </div>
    </div>
  );
};

export default TVSettings;