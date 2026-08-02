import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

const USER_TYPES = ["Lector", "Escritor", "Ambos"];
const HARD_OPTIONS = [
  "Publicar un libro",
  "Encontrar contenido",
  "Usar la biblioteca",
  "Interactuar en la comunidad",
  "Configurar mi perfil",
  "Nada, todo fue claro",
  "Otro",
];
const FEATURES = ["Explorar", "Biblioteca", "Publicaciones", "Comunidad", "Perfil"];

interface Props {
  userId: string;
  onClose: () => void;
  onCompleted: () => void;
}

const Chip = ({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-all",
      active
        ? "bg-primary text-primary-foreground border-primary shadow-[0_4px_14px_hsl(var(--primary)/0.35)]"
        : "bg-muted/50 text-muted-foreground border-border/60 hover:bg-muted"
    )}
  >
    {children}
  </button>
);

const ExperienceSurvey = ({ userId, onClose, onCompleted }: Props) => {
  const [userType, setUserType] = useState("");
  const [hardest, setHardest] = useState("");
  const [hardestOther, setHardestOther] = useState("");
  const [feature, setFeature] = useState("");
  const [improvements, setImprovements] = useState("");
  const [wishes, setWishes] = useState("");
  const [nps, setNps] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const { error } = await supabase.from("survey_responses").insert({
      user_id: userId,
      user_type: userType || null,
      hardest_to_understand: hardest === "Otro" ? hardestOther || "Otro" : hardest || null,
      most_used_feature: feature || null,
      improvements: improvements || null,
      wishes: wishes || null,
      nps,
    });
    setSaving(false);
    if (error) {
      toast.error("No se pudo enviar la encuesta");
      return;
    }
    toast.success("¡Gracias por tu opinión!");
    onCompleted();
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1900] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      >
        <motion.div
          initial={{ y: 60, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 30 }}
          className="liquid-glass-strong liquid-glass w-full sm:max-w-lg max-h-[88vh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] border border-border/40 bg-card/95 backdrop-blur-2xl p-6 pb-8"
        >
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-display font-bold text-foreground">
              Tu opinión nos ayuda a mejorar Lettora
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">
            Gracias por utilizar Lettora. Queremos construir la mejor comunidad para lectores y escritores. Tu opinión
            es muy importante.
          </p>

          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold mb-2">¿Qué tipo de usuario eres?</p>
              <div className="flex flex-wrap gap-2">
                {USER_TYPES.map((t) => (
                  <Chip key={t} active={userType === t} onClick={() => setUserType(t)}>{t}</Chip>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">¿Qué fue lo más difícil de entender?</p>
              <div className="flex flex-wrap gap-2">
                {HARD_OPTIONS.map((t) => (
                  <Chip key={t} active={hardest === t} onClick={() => setHardest(t)}>{t}</Chip>
                ))}
              </div>
              {hardest === "Otro" && (
                <Input
                  value={hardestOther}
                  onChange={(e) => setHardestOther(e.target.value)}
                  placeholder="Cuéntanos cuál"
                  className="mt-2 rounded-xl"
                />
              )}
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">¿Qué función utilizas más?</p>
              <div className="flex flex-wrap gap-2">
                {FEATURES.map((t) => (
                  <Chip key={t} active={feature === t} onClick={() => setFeature(t)}>{t}</Chip>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">¿Qué mejorarías en Lettora?</p>
              <Textarea
                value={improvements}
                onChange={(e) => setImprovements(e.target.value)}
                placeholder="Tus ideas..."
                className="rounded-2xl min-h-[80px]"
              />
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">¿Qué te gustaría que agregáramos?</p>
              <Textarea
                value={wishes}
                onChange={(e) => setWishes(e.target.value)}
                placeholder="Nuevas funciones, secciones..."
                className="rounded-2xl min-h-[80px]"
              />
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">
                Del 1 al 10, ¿qué tan probable es que recomiendes Lettora?
              </p>
              <div className="grid grid-cols-10 gap-1.5">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNps(n)}
                    className={cn(
                      "aspect-square rounded-xl text-[13px] font-semibold border transition-all",
                      nps === n
                        ? "bg-primary text-primary-foreground border-primary scale-105"
                        : "bg-muted/50 text-muted-foreground border-border/60 hover:bg-muted"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <Button variant="outline" className="rounded-full flex-1" onClick={onClose} disabled={saving}>
              Más tarde
            </Button>
            <Button className="rounded-full flex-1" onClick={submit} disabled={saving}>
              {saving ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default ExperienceSurvey;