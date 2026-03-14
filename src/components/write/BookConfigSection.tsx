import { motion } from "framer-motion";
import { Shield, Bot, ShieldCheck, ChevronDown, Info } from "lucide-react";

interface BookConfigSectionProps {
  ageRating: string;
  setAgeRating: (v: string) => void;
  aiGenerated: boolean;
  setAiGenerated: (v: boolean) => void;
  requestVerification: boolean;
  setRequestVerification: (v: boolean) => void;
}

const ageRatings = [
  { value: "all", label: "Todas las edades", desc: "Contenido apto para todos" },
  { value: "13+", label: "+13 años", desc: "Temas adolescentes" },
  { value: "16+", label: "+16 años", desc: "Contenido maduro" },
  { value: "18+", label: "+18 años", desc: "Solo adultos" },
];

const BookConfigSection = ({
  ageRating,
  setAgeRating,
  aiGenerated,
  setAiGenerated,
  requestVerification,
  setRequestVerification,
}: BookConfigSectionProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="ios-section"
    >
      <div className="px-4 py-2">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          Configuración del libro
        </p>
      </div>

      {/* Age Rating */}
      <div className="px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-5 h-5 text-primary flex-shrink-0" />
          <span className="text-[15px] font-medium">Clasificación por edad</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 mt-2">
          {ageRatings.map((rating) => (
            <button
              key={rating.value}
              onClick={() => setAgeRating(rating.value)}
              className={`flex flex-col items-center py-2 px-1 rounded-xl text-center transition-colors ${
                ageRating === rating.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              <span className="text-[13px] font-semibold">{rating.label}</span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">
          {ageRatings.find((r) => r.value === ageRating)?.desc}
        </p>
      </div>

      {/* AI Generated toggle */}
      <button
        onClick={() => setAiGenerated(!aiGenerated)}
        className="w-full flex items-center gap-3 px-4 py-3 border-b border-border/30"
      >
        <Bot className="w-5 h-5 text-primary flex-shrink-0" />
        <div className="flex-1 text-left">
          <span className="text-[15px] font-medium">Generado con IA</span>
          <p className="text-[11px] text-muted-foreground">
            Marca si el contenido fue creado con inteligencia artificial
          </p>
        </div>
        <div
          className={`w-12 h-7 rounded-full transition-colors flex items-center px-0.5 ${
            aiGenerated ? "bg-primary" : "bg-muted"
          }`}
        >
          <div
            className={`w-6 h-6 rounded-full bg-background shadow-sm transition-transform ${
              aiGenerated ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </div>
      </button>

      {/* Request Admin Verification */}
      <button
        onClick={() => setRequestVerification(!requestVerification)}
        className="w-full flex items-center gap-3 px-4 py-3"
      >
        <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0" />
        <div className="flex-1 text-left">
          <span className="text-[15px] font-medium">Solicitar verificación</span>
          <p className="text-[11px] text-muted-foreground">
            Un administrador revisará y aprobará tu libro
          </p>
        </div>
        <div
          className={`w-12 h-7 rounded-full transition-colors flex items-center px-0.5 ${
            requestVerification ? "bg-primary" : "bg-muted"
          }`}
        >
          <div
            className={`w-6 h-6 rounded-full bg-background shadow-sm transition-transform ${
              requestVerification ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </div>
      </button>
    </motion.div>
  );
};

export default BookConfigSection;
