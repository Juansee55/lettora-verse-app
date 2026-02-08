import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Megaphone, ImagePlus, Loader2, Trash2 } from "lucide-react";
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Archivo no válido",
        description: "Solo se permiten imágenes.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Archivo muy grande",
        description: "El tamaño máximo es 5MB.",
        variant: "destructive",
      });
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    setUploading(true);

    const fileExt = imageFile.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `announcements/${fileName}`;

    const { error } = await supabase.storage
      .from("announcements")
      .upload(filePath, imageFile, { contentType: imageFile.type });

    setUploading(false);

    if (error) {
      toast({
        title: "Error al subir imagen",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("announcements")
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

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

    let imageUrl: string | null = null;
    if (imageFile) {
      imageUrl = await uploadImage();
      if (imageFile && !imageUrl) {
        setSaving(false);
        return;
      }
    }

    const { error } = await (supabase.from("announcements" as any).insert({
      title: title.trim(),
      description: description.trim(),
      image_url: imageUrl,
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
      removeImage();
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
                disabled={saving || uploading || !title.trim() || !description.trim()}
              >
                {saving || uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publicar"}
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

              {/* Image Upload */}
              <div>
                <label className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Imagen (opcional)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />

                {!imagePreview ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-muted/30 transition-colors"
                  >
                    <ImagePlus className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Toca para subir una imagen
                    </span>
                  </button>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border border-border">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-40 object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                    {uploading && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                )}
              </div>
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
