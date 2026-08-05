import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Search, Check, Play, FolderOpen, Camera } from "lucide-react";

interface GalleryItem {
  id: string;
  file: File;
  url: string;
  isVideo: boolean;
  date: Date;
  folder: string;
}

interface Props {
  onSelect: (files: File[]) => void;
  onClose: () => void;
  onOpenCamera: () => void;
}

const dateLabel = (d: Date) => {
  const today = new Date();
  const y = new Date(today); y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Hoy";
  if (d.toDateString() === y.toDateString()) return "Ayer";
  return d.toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
};

const GlimpseGallery = ({ onSelect, onClose, onOpenCamera }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "photos" | "videos">("all");
  const [preview, setPreview] = useState<GalleryItem | null>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.click(), 250);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => () => items.forEach((i) => URL.revokeObjectURL(i.url)), [items]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const mapped: GalleryItem[] = files.map((file, idx) => {
      const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath || "";
      return {
        id: `${file.name}-${idx}-${file.lastModified}`,
        file,
        url: URL.createObjectURL(file),
        isVideo: file.type.startsWith("video"),
        date: new Date(file.lastModified),
        folder: rel.includes("/") ? rel.split("/")[0] : "Dispositivo",
      };
    });
    setItems((prev) => [...mapped, ...prev].sort((a, b) => b.date.getTime() - a.date.getTime()));
  };

  const filtered = useMemo(
    () =>
      items.filter((i) => {
        if (tab === "photos" && i.isVideo) return false;
        if (tab === "videos" && !i.isVideo) return false;
        if (query && !i.file.name.toLowerCase().includes(query.toLowerCase()) && !i.folder.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      }),
    [items, tab, query]
  );

  const groups = useMemo(() => {
    const map = new Map<string, GalleryItem[]>();
    filtered.forEach((i) => {
      const key = dateLabel(i.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(i);
    });
    return [...map.entries()];
  }, [filtered]);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const confirm = () => {
    const chosen = selected.length
      ? selected.map((id) => items.find((i) => i.id === id)!.file)
      : preview
      ? [preview.file]
      : [];
    if (chosen.length) onSelect(chosen);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ type: "spring", stiffness: 320, damping: 34 }}
      className="fixed inset-0 z-[120] bg-background flex flex-col"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />

      <div className="liquid-glass px-4 pt-4 pb-3 flex items-center justify-between">
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-[17px] font-semibold">Galería</h2>
        <button
          onClick={confirm}
          disabled={!selected.length && !preview}
          className="px-4 h-9 rounded-full bg-primary text-primary-foreground text-[13px] font-semibold disabled:opacity-40"
        >
          Siguiente{selected.length > 1 ? ` (${selected.length})` : ""}
        </button>
      </div>

      <div className="px-4 py-2 flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 h-10 px-3 rounded-2xl bg-muted/60">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar fotos y videos"
            className="flex-1 bg-transparent outline-none text-[14px] allow-select"
          />
        </div>
        <button onClick={onOpenCamera} className="w-10 h-10 rounded-2xl bg-muted/60 flex items-center justify-center">
          <Camera className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 pb-2 flex gap-2">
        {([["all", "Todo"], ["photos", "Fotos"], ["videos", "Videos"]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-3.5 h-8 rounded-full text-[12px] font-medium transition-colors ${
              tab === id ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
        <button onClick={() => inputRef.current?.click()} className="ml-auto px-3.5 h-8 rounded-full bg-muted/60 text-[12px] font-medium flex items-center gap-1.5">
          <FolderOpen className="w-3.5 h-3.5" /> Carpetas
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-1 pb-24" style={{ scrollBehavior: "smooth" }}>
        {!items.length && (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-10">
            <FolderOpen className="w-10 h-10 text-muted-foreground" />
            <p className="text-[14px] text-muted-foreground">
              Selecciona fotos y videos de tu dispositivo para verlos aquí.
            </p>
            <button onClick={() => inputRef.current?.click()} className="px-4 h-10 rounded-full bg-primary text-primary-foreground text-[13px] font-semibold">
              Abrir dispositivo
            </button>
          </div>
        )}

        {groups.map(([label, groupItems]) => (
          <div key={label} className="mb-4">
            <p className="px-3 py-2 text-[13px] font-semibold text-muted-foreground sticky top-0 bg-background/80 backdrop-blur z-10">
              {label}
            </p>
            <div className="grid grid-cols-3 gap-[2px]">
              {groupItems.map((item) => {
                const idx = selected.indexOf(item.id);
                return (
                  <motion.button
                    key={item.id}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => toggle(item.id)}
                    onDoubleClick={() => setPreview(item)}
                    className="relative aspect-square overflow-hidden bg-muted"
                  >
                    {item.isVideo ? (
                      <>
                        <video src={item.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                        <Play className="absolute bottom-1.5 left-1.5 w-4 h-4 text-white drop-shadow" />
                      </>
                    ) : (
                      <img src={item.url} alt={item.file.name} loading="lazy" className="w-full h-full object-cover" />
                    )}
                    <span
                      className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                        idx >= 0 ? "bg-primary border-primary text-primary-foreground" : "border-white/80"
                      }`}
                    >
                      {idx >= 0 ? idx + 1 : ""}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {preview && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[130] bg-black flex flex-col">
          <div className="p-4 flex justify-between">
            <button onClick={() => setPreview(null)} className="w-9 h-9 rounded-full liquid-glass flex items-center justify-center">
              <X className="w-5 h-5 text-white" />
            </button>
            <button onClick={() => onSelect([preview.file])} className="px-4 h-9 rounded-full bg-primary text-primary-foreground text-[13px] font-semibold">
              Usar
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            {preview.isVideo ? (
              <video src={preview.url} controls playsInline className="max-h-full max-w-full" />
            ) : (
              <img src={preview.url} alt="" className="max-h-full max-w-full object-contain" />
            )}
          </div>
        </motion.div>
      )}

      {selected.length > 0 && (
        <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="absolute bottom-5 left-4 right-4 h-12 rounded-2xl liquid-glass flex items-center justify-between px-4">
          <span className="text-[13px] font-medium">{selected.length} seleccionados</span>
          <button onClick={confirm} className="flex items-center gap-1.5 text-primary text-[13px] font-semibold">
            Continuar <Check className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default GlimpseGallery;