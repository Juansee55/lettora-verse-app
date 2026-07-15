import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CHAT_WALLPAPER_PRESETS } from "@/lib/chatWallpapers";

interface Props {
  userId: string;
  currentValue: string | null;
  onChange: (value: string) => void;
}

const ChatWallpaperPicker = ({ userId, currentValue, onChange }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const save = async (value: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ chat_wallpaper: value } as any)
      .eq("id", userId);
    if (error) {
      toast.error("No se pudo guardar el fondo");
      return;
    }
    onChange(value);
    toast.success("Fondo actualizado");
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Solo imágenes");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Máximo 5MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `chat-wallpapers/${userId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("posts")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("posts").getPublicUrl(path);
      if (data?.publicUrl) await save(data.publicUrl);
    } catch (err: any) {
      toast.error(err?.message ?? "Error al subir imagen");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const isCustomImage =
    !!currentValue && !currentValue.startsWith("preset:");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2.5">
        {CHAT_WALLPAPER_PRESETS.map((p) => {
          const value = `preset:${p.id}`;
          const selected = currentValue === value || (!currentValue && p.id === "default");
          return (
            <motion.button
              key={p.id}
              whileTap={{ scale: 0.92 }}
              onClick={() => save(value)}
              className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all ${
                selected ? "border-primary shadow-lg shadow-primary/25" : "border-border/40"
              }`}
              style={{ background: p.preview }}
              aria-label={p.name}
            >
              {selected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/25"
                >
                  <Check className="w-5 h-5 text-white" />
                </motion.div>
              )}
            </motion.button>
          );
        })}

        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className={`relative aspect-square rounded-2xl overflow-hidden border-2 flex items-center justify-center bg-muted/40 transition-all ${
            isCustomImage ? "border-primary shadow-lg shadow-primary/25" : "border-dashed border-border/60"
          }`}
          style={
            isCustomImage
              ? { backgroundImage: `url(${currentValue})`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          ) : isCustomImage ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Check className="w-5 h-5 text-white" />
            </div>
          ) : (
            <Upload className="w-5 h-5 text-muted-foreground" />
          )}
        </motion.button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      <p className="text-[11px] text-muted-foreground/70 text-center">
        Elige un fondo predefinido o sube el tuyo (máx 5MB)
      </p>
    </div>
  );
};

export default ChatWallpaperPicker;