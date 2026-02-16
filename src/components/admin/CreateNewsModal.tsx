import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateNewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const CreateNewsModal = ({ isOpen, onClose, onCreated }: CreateNewsModalProps) => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [newsType, setNewsType] = useState("update");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      toast({ title: "Completa todos los campos", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let imageUrl: string | null = null;

    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `news/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("announcements")
        .upload(path, imageFile);

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("announcements").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
    }

    const { error } = await (supabase.from("news" as any).insert({
      title: title.trim(),
      description: description.trim(),
      news_type: newsType,
      image_url: imageUrl,
      created_by: user.id,
    } as any) as any);

    if (error) {
      toast({ title: "Error al crear noticia", variant: "destructive" });
    } else {
      toast({ title: "✅ Noticia publicada" });
      setTitle("");
      setDescription("");
      setNewsType("update");
      setImageFile(null);
      setImagePreview(null);
      onCreated();
      onClose();
    }
    setSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 300 }}
          animate={{ y: 0 }}
          exit={{ y: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[85vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-[17px] font-semibold">Nueva noticia</h2>
            <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>

          <div className="p-4 space-y-4">
            <Input
              placeholder="Título de la noticia"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl"
            />

            <Textarea
              placeholder="Descripción detallada..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl min-h-[120px]"
            />

            <Select value={newsType} onValueChange={setNewsType}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="update">Actualización</SelectItem>
                <SelectItem value="patch">Parche</SelectItem>
                <SelectItem value="bug">Bug Fix</SelectItem>
              </SelectContent>
            </Select>

            {/* Image upload */}
            <div>
              <label className="text-sm font-medium mb-2 block">Imagen (opcional)</label>
              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden">
                  <img src={imagePreview} alt="" className="w-full h-40 object-cover" />
                  <button
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <span className="text-[13px] text-muted-foreground">Subir imagen</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              )}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full rounded-xl h-11"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Publicar noticia
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreateNewsModal;
