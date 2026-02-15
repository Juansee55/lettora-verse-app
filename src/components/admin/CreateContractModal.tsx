import { useState } from "react";
import { X, Loader2, Image } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const CreateContractModal = ({ isOpen, onClose, onCreated }: CreateContractModalProps) => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [formLink, setFormLink] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let coverUrl: string | null = null;

    if (coverFile) {
      const ext = coverFile.name.split(".").pop();
      const path = `contracts/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("announcements")
        .upload(path, coverFile);

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("announcements")
          .getPublicUrl(path);
        coverUrl = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from("staff_contracts").insert({
      title: title.trim(),
      description: description.trim() || null,
      form_link: formLink.trim() || null,
      cover_url: coverUrl,
      created_by: user.id,
      ends_at: endsAt || null,
    });

    if (error) {
      toast({ title: "Error al crear contrato", variant: "destructive" });
    } else {
      toast({ title: "✅ Contrato creado" });
      onCreated();
      onClose();
      setTitle("");
      setDescription("");
      setFormLink("");
      setEndsAt("");
      setCoverFile(null);
      setCoverPreview(null);
    }
    setSubmitting(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 400 }}
            animate={{ y: 0 }}
            exit={{ y: 400 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-card rounded-t-3xl overflow-hidden max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-[17px] font-semibold">Nuevo Staff Contract</h2>
              <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>

            <div className="p-4 space-y-4">
              {/* Cover */}
              <div>
                <label className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">Portada</label>
                {coverPreview ? (
                  <div className="mt-2 relative">
                    <img src={coverPreview} alt="" className="w-full h-40 object-cover rounded-xl" />
                    <button
                      onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <label className="mt-2 flex items-center justify-center gap-2 h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/30 transition-colors">
                    <Image className="w-5 h-5 text-muted-foreground" />
                    <span className="text-[15px] text-muted-foreground">Subir imagen</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
                  </label>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">Título *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título del contrato"
                  className="mt-1 w-full h-11 px-4 rounded-xl bg-muted/60 text-[17px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">Descripción</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción del contrato..."
                  rows={3}
                  className="mt-1 w-full px-4 py-3 rounded-xl bg-muted/60 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              {/* Form link */}
              <div>
                <label className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">Link del formulario</label>
                <input
                  value={formLink}
                  onChange={(e) => setFormLink(e.target.value)}
                  placeholder="https://forms.google.com/..."
                  className="mt-1 w-full h-11 px-4 rounded-xl bg-muted/60 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* End date */}
              <div>
                <label className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">Fecha de finalización</label>
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="mt-1 w-full h-11 px-4 rounded-xl bg-muted/60 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={!title.trim() || submitting}
                className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-semibold text-[17px] disabled:opacity-50 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Crear contrato"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CreateContractModal;
