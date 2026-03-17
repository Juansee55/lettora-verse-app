import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Award, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const EMOJIS = ["⭐", "🏆", "🎖", "💎", "🔥", "👑", "🎂", "❤️", "⚡", "🌟", "🎯", "🦋", "🌈", "🎪", "📚", "✍️", "🎭", "🎨"];

const CreateBadgeModal = ({ isOpen, onClose, onCreated }: CreateBadgeModalProps) => {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("⭐");
  const [description, setDescription] = useState("");
  const [badgeType, setBadgeType] = useState("custom");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await (supabase.from("user_badges" as any).insert({
      name: name.trim(),
      emoji,
      description: description.trim() || null,
      badge_type: badgeType,
      created_by: user.id,
    }) as any);

    if (error) {
      toast({ title: "Error al crear insignia", variant: "destructive" });
    } else {
      toast({ title: "✅ Insignia creada" });
      setName(""); setEmoji("⭐"); setDescription(""); setBadgeType("custom");
      onCreated();
      onClose();
    }
    setSaving(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card rounded-t-2xl sm:rounded-2xl w-full max-w-md overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Nueva insignia
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <label className="text-[13px] text-muted-foreground mb-1 block">Nombre</label>
              <Input
                placeholder="Ej: Escritor Estrella"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[13px] text-muted-foreground mb-1 block">Emoji</label>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-colors ${
                      emoji === e ? "bg-primary/20 ring-2 ring-primary" : "bg-muted/50 hover:bg-muted"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[13px] text-muted-foreground mb-1 block">Descripción (opcional)</label>
              <Textarea
                placeholder="Descripción de la insignia..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[60px] resize-none"
              />
            </div>

            <div>
              <label className="text-[13px] text-muted-foreground mb-1 block">Tipo</label>
              <div className="flex gap-2">
                {[
                  { key: "custom", label: "General" },
                  { key: "birthday", label: "Cumpleaños" },
                  { key: "event", label: "Evento" },
                  { key: "achievement", label: "Logro" },
                ].map(t => (
                  <button
                    key={t.key}
                    onClick={() => setBadgeType(t.key)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                      badgeType === t.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-muted/30 rounded-xl p-3 flex items-center gap-3">
              <span className="text-2xl">{emoji}</span>
              <div>
                <p className="font-medium text-[14px]">{name || "Nombre de insignia"}</p>
                <p className="text-[12px] text-muted-foreground">{description || "Sin descripción"}</p>
              </div>
            </div>

            <Button onClick={handleCreate} disabled={saving || !name.trim()} className="w-full rounded-xl">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Crear insignia
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreateBadgeModal;
