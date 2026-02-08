import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Type, Image, Film, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COLORS = [
  "#6B46C1", "#E53E3E", "#DD6B20", "#D69E2E",
  "#38A169", "#3182CE", "#805AD5", "#D53F8C",
  "#1A202C", "#2D3748", "#4A5568", "#718096",
];

const CreateStoryModal = ({ isOpen, onClose }: CreateStoryModalProps) => {
  const { toast } = useToast();
  const [mode, setMode] = useState<"text" | "media">("text");
  const [textContent, setTextContent] = useState("");
  const [bgColor, setBgColor] = useState(COLORS[0]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
    setMode("media");
  };

  const handlePublish = async () => {
    if (mode === "text" && !textContent.trim()) return;
    if (mode === "media" && !mediaFile) return;
    setPublishing(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setPublishing(false); return; }

    let mediaUrl = null;
    let mediaType = "text";

    if (mediaFile) {
      const ext = mediaFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("stories").upload(path, mediaFile);
      if (!error) {
        const { data } = supabase.storage.from("stories").getPublicUrl(path);
        mediaUrl = data.publicUrl;
        mediaType = mediaFile.type.startsWith("video") ? "video" : "image";
      }
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from("stories").insert({
      user_id: user.id,
      media_url: mediaUrl,
      media_type: mediaUrl ? mediaType : "text",
      text_content: textContent.trim() || null,
      background_color: mode === "text" ? bgColor : "#000000",
      expires_at: expiresAt,
    });

    if (error) {
      toast({ title: "Error al publicar historia", variant: "destructive" });
    } else {
      toast({ title: "¡Historia publicada!" });
      resetAndClose();
    }
    setPublishing(false);
  };

  const resetAndClose = () => {
    setTextContent("");
    setBgColor(COLORS[0]);
    setMediaFile(null);
    setMediaPreview(null);
    setMode("text");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background"
      >
        {/* Header */}
        <div className="ios-header">
          <div className="flex items-center justify-between px-4 h-[52px]">
            <button onClick={resetAndClose} className="text-primary text-[17px]">Cancelar</button>
            <h2 className="font-semibold text-[17px]">Nueva historia</h2>
            <Button
              variant="ios"
              size="ios-sm"
              onClick={handlePublish}
              disabled={publishing || (mode === "text" && !textContent.trim()) || (mode === "media" && !mediaFile)}
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publicar"}
            </Button>
          </div>
        </div>

        {/* Mode selector */}
        <div className="flex gap-2 px-4 py-3">
          <button
            onClick={() => setMode("text")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium ${
              mode === "text" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            <Type className="w-4 h-4" /> Texto
          </button>
          <label
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium cursor-pointer ${
              mode === "media" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            <Image className="w-4 h-4" /> Foto/Video
            <input type="file" accept="image/*,video/*" className="hidden" onChange={handleMediaSelect} />
          </label>
        </div>

        {/* Preview */}
        <div className="flex-1 px-4">
          {mode === "text" ? (
            <div
              className="w-full aspect-[9/16] max-h-[60vh] rounded-3xl flex items-center justify-center p-8 transition-colors"
              style={{ backgroundColor: bgColor }}
            >
              <Textarea
                placeholder="Escribe tu historia..."
                value={textContent}
                onChange={e => setTextContent(e.target.value.slice(0, 200))}
                className="bg-transparent border-0 text-white text-2xl font-display font-bold text-center resize-none focus-visible:ring-0 placeholder:text-white/50"
                style={{ minHeight: "100px" }}
              />
            </div>
          ) : mediaPreview ? (
            <div className="w-full aspect-[9/16] max-h-[60vh] rounded-3xl overflow-hidden relative bg-black">
              {mediaFile?.type.startsWith("video") ? (
                <video src={mediaPreview} controls className="w-full h-full object-contain" />
              ) : (
                <img src={mediaPreview} alt="" className="w-full h-full object-contain" />
              )}
            </div>
          ) : (
            <div className="w-full aspect-[9/16] max-h-[60vh] rounded-3xl bg-muted/50 flex items-center justify-center">
              <div className="text-center">
                <Image className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Selecciona una foto o video</p>
              </div>
            </div>
          )}
        </div>

        {/* Color picker for text mode */}
        {mode === "text" && (
          <div className="px-4 py-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setBgColor(color)}
                  className={`w-8 h-8 rounded-full flex-shrink-0 border-2 transition-transform ${
                    bgColor === color ? "border-primary scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {bgColor === color && <Check className="w-4 h-4 text-white mx-auto" />}
                </button>
              ))}
            </div>
            <p className="text-[12px] text-muted-foreground mt-2 text-center">{textContent.length}/200</p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default CreateStoryModal;
