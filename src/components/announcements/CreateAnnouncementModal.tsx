import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Megaphone, ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateAnnouncementModal = ({ isOpen, onClose }: CreateAnnouncementModalProps) => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || !description.trim()) {
      toast({
        title: "Campos requeridos",
        description: "Título y descripción son obligatorios.",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setSaving(true);

    const { error } = await (supabase.from("announcements" as any).insert({
      title: title.trim(),
      description: description.trim(),
      image_url: imageUrl.trim() || null,
      created_by: user.id,
    } as any) as any);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la noticia. ¿Eres admin?",
        variant: "destructive",
      });
    } else {
      toast({
        title: "¡Noticia creada!",
        description: "Todos los usuarios la verán al iniciar sesión.",
      });
      setTitle("");
      setDescription("");
      setImageUrl("");
      onClose();
    }
    setSaving(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background flex flex-col"
        >
          {/* iOS Header */}
          <div className="ios-header">
            <div className="flex items-center justify-between px-4 h-[52px]">
              <button onClick={onClose} className="text-primary text-[17px]">
                Cancelar
              </button>
              <h2 className="font-semibold text-[17px] flex items-center gap-2">
                <Megaphone className="w-4 h-4" />
                Nueva noticia
              </h2>
              <Button
                variant="ios"
                size="ios-sm"
                onClick={handleCreate}
                disabled={saving || !title.trim() || !description.trim()}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publicar"}
              </Button>
            </div>
          </div>

          {/* Form */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5 max-w-lg mx-auto w-full">
            <div className="ios-section p-4 space-y-4">
              <div>
                <label className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Título
                </label>
                <Input
                  placeholder="Título de la noticia"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-[17px] border-0 bg-muted/50 focus-visible:ring-1 rounded-xl h-12"
                />
              </div>

              <div>
                <label className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Descripción
                </label>
                <Textarea
                  placeholder="Escribe el contenido de la noticia..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[150px] text-[17px] leading-relaxed border-0 bg-muted/50 focus-visible:ring-1 resize-none rounded-xl"
                />
              </div>

              <div>
                <label className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Imagen (opcional)
                </label>
                <div className="flex items-center gap-2">
                  <ImagePlus className="w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="URL de la imagen"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="flex-1 border-0 bg-muted/50 focus-visible:ring-1 rounded-xl h-12"
                  />
                </div>
              </div>

              {imageUrl && (
                <div className="rounded-xl overflow-hidden border border-border">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-40 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>

            <p className="text-[13px] text-muted-foreground text-center px-4">
              Esta noticia aparecerá como un popup para todos los usuarios la próxima vez que abran la app.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CreateAnnouncementModal;
