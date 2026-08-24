import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Type, Smile, Music2, Sliders, Wand2, Pencil, Eraser, Undo2, Trash2,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Loader2, ChevronRight, Check, Play, Pause,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  GLIMPSE_FONTS, GLIMPSE_FILTERS, GLIMPSE_STICKERS, EMOJI_SET, GLIMPSE_MUSIC,
  DEFAULT_ADJUST, adjustCss, filterCss, fontFamilyOf, compressImage,
  PRIVACY_OPTIONS, DEFAULT_GLIMPSE_MUSIC_CLIP_SECONDS, MIN_GLIMPSE_MUSIC_CLIP_SECONDS, MAX_GLIMPSE_MUSIC_CLIP_SECONDS,
  type GlimpseAdjust, type OverlayLayer, type GlimpseTrack,
} from "./glimpseData";

interface Props {
  file: File | null;
  onClose: () => void;
  onPublished: () => void;
}

const TEXT_COLORS = ["#FFFFFF", "#000000", "#7C3AED", "#EC4899", "#F59E0B", "#10B981", "#0EA5E9", "#EF4444", "#F472B6", "#A3E635"];
const BG_COLORS = ["#7C3AED", "#111827", "#EC4899", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444", "#4C1D95"];

type Panel = null | "text" | "stickers" | "music" | "adjust" | "filters" | "draw" | "share";

const GlimpseEditor = ({ file, onClose, onPublished }: Props) => {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const drawing = useRef(false);

  const isVideo = !!file?.type.startsWith("video");
  const mediaUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (mediaUrl) URL.revokeObjectURL(mediaUrl); }, [mediaUrl]);

  const [panel, setPanel] = useState<Panel>(null);
  const [layers, setLayers] = useState<OverlayLayer[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [plainText, setPlainText] = useState("");

  const [filter, setFilter] = useState("none");
  const [filterIntensity, setFilterIntensity] = useState(1);
  const [adjust, setAdjust] = useState<GlimpseAdjust>(DEFAULT_ADJUST);

  const [track, setTrack] = useState<GlimpseTrack | null>(null);
  const [trackStart, setTrackStart] = useState(0);
  const [clipDuration, setClipDuration] = useState(DEFAULT_GLIMPSE_MUSIC_CLIP_SECONDS);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicQuery, setMusicQuery] = useState("");

  const [brushColor, setBrushColor] = useState("#FFFFFF");
  const [brushSize, setBrushSize] = useState(6);
  const [eraser, setEraser] = useState(false);

  const [privacy, setPrivacy] = useState<string>("public");
  const [duration, setDuration] = useState(5);
  const [publishing, setPublishing] = useState(false);

  const activeText = layers.find((l) => l.id === activeId && l.kind === "text") as Extract<OverlayLayer, { kind: "text" }> | undefined;

  /* ── Music preview ── */
  useEffect(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    setMusicPlaying(false);
    if (!track) return;

    const audio = new Audio(track.url);
    const clipEnd = Math.min(track.duration, trackStart + clipDuration);
    const stopAtClipEnd = () => {
      if (audio.currentTime >= clipEnd) {
        audio.pause();
        audio.currentTime = trackStart;
        setMusicPlaying(false);
      }
    };
    audio.preload = "metadata";
    audio.currentTime = trackStart;
    audio.addEventListener("timeupdate", stopAtClipEnd);
    audio.addEventListener("ended", stopAtClipEnd);
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", stopAtClipEnd);
      audio.removeEventListener("ended", stopAtClipEnd);
    };
  }, [track, trackStart, clipDuration]);

  const toggleMusic = () => {
    const a = audioRef.current;
    if (!a || !track) return;
    if (musicPlaying) {
      a.pause();
      setMusicPlaying(false);
      return;
    }
    if (a.currentTime >= trackStart + clipDuration) a.currentTime = trackStart;
    void a.play().then(() => setMusicPlaying(true)).catch(() => setMusicPlaying(false));
  };

  /* ── Drawing ── */
  useEffect(() => {
    if (panel !== "draw") return;
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    canvas.width = stage.clientWidth;
    canvas.height = stage.clientHeight;
  }, [panel]);

  const drawAt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d")!;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brushSize;
    ctx.globalCompositeOperation = eraser ? "destination-out" : "source-over";
    ctx.strokeStyle = brushColor;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const beginDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const clearDraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
  };

  /* ── Layers ── */
  const addText = () => {
    const id = crypto.randomUUID();
    setLayers((l) => [
      ...l,
      { kind: "text", id, text: "Escribe algo", x: 0.5, y: 0.45, font: "sans", color: "#FFFFFF", size: 30, rotation: 0, opacity: 1, bold: true, italic: false, underline: false, align: "center", shadow: true },
    ]);
    setActiveId(id);
    setPanel("text");
  };

  const addSticker = (emoji: string) => {
    const id = crypto.randomUUID();
    setLayers((l) => [...l, { kind: "sticker", id, emoji, x: 0.5, y: 0.5, size: 64, rotation: 0, opacity: 1 }]);
    setActiveId(id);
    setPanel(null);
  };

  const patchLayer = (id: string, patch: Partial<Extract<OverlayLayer, { kind: "text" }>> & Record<string, unknown>) =>
    setLayers((ls) => ls.map((l) => (l.id === id ? ({ ...l, ...patch } as OverlayLayer) : l)));

  const removeLayer = (id: string) => {
    setLayers((ls) => ls.filter((l) => l.id !== id));
    setActiveId(null);
  };

  const dragLayer = (id: string, info: { point: { x: number; y: number } }) => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    patchLayer(id, {
      x: Math.min(1, Math.max(0, (info.point.x - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (info.point.y - rect.top) / rect.height)),
    });
  };

  const combinedFilter = `${filterCss(filter, filterIntensity)} ${adjustCss(adjust)}`;

  /* ── Publish ── */
  const publish = async () => {
    setPublishing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesión no válida");

      let mediaUrlUploaded: string | null = null;
      let mediaType = "text";

      if (file) {
        const blob = isVideo ? file : await compressImage(file);
        const ext = isVideo ? (file.name.split(".").pop() || "webm") : "jpg";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("stories").upload(path, blob, {
          contentType: isVideo ? file.type : "image/jpeg",
          upsert: false,
        });
        if (upErr) throw upErr;
        mediaUrlUploaded = supabase.storage.from("stories").getPublicUrl(path).data.publicUrl;
        mediaType = isVideo ? "video" : "image";
      }

      const drawCanvas = canvasRef.current;
      const allLayers: OverlayLayer[] = [...layers];
      if (drawCanvas) {
        const ctx = drawCanvas.getContext("2d");
        const hasInk = ctx && new Uint32Array(ctx.getImageData(0, 0, drawCanvas.width, drawCanvas.height).data.buffer).some((p) => p !== 0);
        if (hasInk) allLayers.push({ kind: "drawing", id: crypto.randomUUID(), dataUrl: drawCanvas.toDataURL("image/png") });
      }

      const { error } = await supabase.from("stories").insert({
        user_id: user.id,
        media_url: mediaUrlUploaded,
        media_type: mediaType,
        text_content: !file ? plainText.trim() || null : null,
        background_color: !file ? bgColor : "#000000",
        privacy,
        filter: `${filter}:${filterIntensity.toFixed(2)}`,
        overlays: allLayers as unknown as never,
        music: track ? ({ ...track, start: trackStart, clip_duration_seconds: clipDuration } as unknown as never) : null,
        duration_ms: (isVideo ? 15 : duration) * 1000,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      if (error) throw error;

      toast({ title: "¡Glimpse publicado!", description: "Estará disponible durante 24 horas." });
      onPublished();
    } catch (e) {
      toast({ title: "No se pudo publicar", description: (e as Error).message, variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  const tools = [
    { id: "text" as const, icon: Type, label: "Texto", action: addText },
    { id: "stickers" as const, icon: Smile, label: "Stickers" },
    { id: "music" as const, icon: Music2, label: "Música" },
    { id: "filters" as const, icon: Wand2, label: "Filtros" },
    { id: "adjust" as const, icon: Sliders, label: "Ajustes" },
    { id: "draw" as const, icon: Pencil, label: "Dibujo" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      className="fixed inset-0 z-[125] bg-black flex flex-col"
    >
      {/* Stage */}
      <div ref={stageRef} className="relative flex-1 overflow-hidden">
        {file ? (
          isVideo ? (
            <video src={mediaUrl!} autoPlay loop muted={!!track} playsInline className="w-full h-full object-cover" style={{ filter: combinedFilter, transform: `rotate(${adjust.rotate}deg)` }} />
          ) : (
            <img src={mediaUrl!} alt="" className="w-full h-full object-cover" style={{ filter: combinedFilter, transform: `rotate(${adjust.rotate}deg)` }} />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center p-8" style={{ background: bgColor }}>
            <textarea
              value={plainText}
              onChange={(e) => setPlainText(e.target.value.slice(0, 280))}
              placeholder="Escribe tu Glimpse..."
              className="allow-select w-full bg-transparent text-white text-2xl font-bold text-center outline-none resize-none placeholder:text-white/50"
              rows={5}
            />
          </div>
        )}

        {/* Overlay layers */}
        {layers.map((layer) => {
          if (layer.kind === "drawing") return null;
          const isActive = activeId === layer.id;
          return (
            <motion.div
              key={layer.id}
              drag
              dragMomentum={false}
              onDragEnd={(_, info) => dragLayer(layer.id, info as never)}
              onPointerDown={() => setActiveId(layer.id)}
              className={`absolute cursor-move ${isActive ? "ring-1 ring-primary/70 rounded-lg" : ""}`}
              style={{
                left: `${layer.x * 100}%`,
                top: `${layer.y * 100}%`,
                transform: `translate(-50%,-50%) rotate(${layer.rotation}deg)`,
                opacity: layer.opacity,
                touchAction: "none",
              }}
            >
              {layer.kind === "text" ? (
                <span
                  className="px-2 whitespace-pre-wrap block max-w-[80vw]"
                  style={{
                    fontFamily: fontFamilyOf(layer.font),
                    color: layer.color,
                    fontSize: layer.size,
                    fontWeight: layer.bold ? 800 : 400,
                    fontStyle: layer.italic ? "italic" : "normal",
                    textDecoration: layer.underline ? "underline" : "none",
                    textAlign: layer.align,
                    textShadow: layer.shadow ? "0 2px 12px rgba(0,0,0,.55)" : "none",
                  }}
                >
                  {layer.text}
                </span>
              ) : (
                <span style={{ fontSize: layer.size }}>{layer.emoji}</span>
              )}
            </motion.div>
          );
        })}

        {/* Draw canvas */}
        <canvas
          ref={canvasRef}
          onPointerDown={beginDraw}
          onPointerMove={drawAt}
          onPointerUp={() => (drawing.current = false)}
          onPointerLeave={() => (drawing.current = false)}
          className="absolute inset-0"
          style={{ pointerEvents: panel === "draw" ? "auto" : "none", touchAction: "none" }}
        />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-start justify-between">
          <button onClick={onClose} className="w-10 h-10 rounded-full liquid-glass flex items-center justify-center">
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="flex flex-col gap-2">
            {tools.map((t) => (
              <button
                key={t.id}
                onClick={() => (t.action ? t.action() : setPanel(panel === t.id ? null : t.id))}
                className={`w-10 h-10 rounded-full liquid-glass flex items-center justify-center ${panel === t.id ? "text-primary" : "text-white"}`}
                aria-label={t.label}
              >
                <t.icon className="w-5 h-5" />
              </button>
            ))}
            {activeId && (
              <button onClick={() => removeLayer(activeId)} className="w-10 h-10 rounded-full liquid-glass flex items-center justify-center text-destructive">
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {track && (
          <button onClick={toggleMusic} className="absolute bottom-4 left-4 flex items-center gap-2 px-3 h-9 rounded-full liquid-glass text-white text-[12px]">
            {musicPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="max-w-[160px] truncate">{track.title} · {clipDuration}s</span>
          </button>
        )}
      </div>

      {/* Panels */}
      <AnimatePresence>
        {panel && panel !== "share" && (
          <motion.div
            initial={{ y: 260 }} animate={{ y: 0 }} exit={{ y: 260 }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="absolute bottom-[92px] left-0 right-0 max-h-[46vh] overflow-y-auto liquid-glass rounded-t-3xl p-4 z-10"
          >
            {panel === "text" && (
              <div className="space-y-3">
                <input
                  value={activeText?.text ?? ""}
                  onChange={(e) => activeText && patchLayer(activeText.id, { text: e.target.value })}
                  placeholder="Texto"
                  className="allow-select w-full h-10 px-3 rounded-xl bg-muted/60 text-[14px] outline-none"
                />
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {GLIMPSE_FONTS.map((f) => (
                    <button key={f.id} onClick={() => activeText && patchLayer(activeText.id, { font: f.id })}
                      style={{ fontFamily: f.family }}
                      className={`px-3 h-9 rounded-full whitespace-nowrap text-[13px] ${activeText?.font === f.id ? "bg-primary text-primary-foreground" : "bg-muted/60"}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {TEXT_COLORS.map((c) => (
                    <button key={c} onClick={() => activeText && patchLayer(activeText.id, { color: c })}
                      className={`w-7 h-7 rounded-full flex-shrink-0 border-2 ${activeText?.color === c ? "border-primary" : "border-white/30"}`}
                      style={{ background: c }} />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {[
                    { icon: Bold, key: "bold" as const },
                    { icon: Italic, key: "italic" as const },
                    { icon: Underline, key: "underline" as const },
                  ].map(({ icon: Icon, key }) => (
                    <button key={key} onClick={() => activeText && patchLayer(activeText.id, { [key]: !activeText[key] } as never)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${activeText?.[key] ? "bg-primary text-primary-foreground" : "bg-muted/60"}`}>
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                  {[
                    { icon: AlignLeft, v: "left" as const },
                    { icon: AlignCenter, v: "center" as const },
                    { icon: AlignRight, v: "right" as const },
                  ].map(({ icon: Icon, v }) => (
                    <button key={v} onClick={() => activeText && patchLayer(activeText.id, { align: v })}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${activeText?.align === v ? "bg-primary text-primary-foreground" : "bg-muted/60"}`}>
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
                <label className="block text-[12px] text-muted-foreground">Tamaño
                  <input type="range" min={14} max={80} value={activeText?.size ?? 30}
                    onChange={(e) => activeText && patchLayer(activeText.id, { size: Number(e.target.value) })}
                    className="w-full accent-primary" />
                </label>
                <label className="block text-[12px] text-muted-foreground">Rotación
                  <input type="range" min={-180} max={180} value={activeText?.rotation ?? 0}
                    onChange={(e) => activeText && patchLayer(activeText.id, { rotation: Number(e.target.value) })}
                    className="w-full accent-primary" />
                </label>
                {!file && (
                  <div className="flex gap-2 overflow-x-auto pt-1">
                    {BG_COLORS.map((c) => (
                      <button key={c} onClick={() => setBgColor(c)}
                        className={`w-7 h-7 rounded-full flex-shrink-0 border-2 ${bgColor === c ? "border-primary" : "border-white/30"}`}
                        style={{ background: c }} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {panel === "stickers" && (
              <div className="space-y-3">
                <p className="text-[13px] font-semibold">Stickers de Lettora</p>
                <div className="grid grid-cols-8 gap-2">
                  {GLIMPSE_STICKERS.map((s) => (
                    <button key={s} onClick={() => addSticker(s)} className="text-2xl">{s}</button>
                  ))}
                </div>
                <p className="text-[13px] font-semibold pt-2">Emojis</p>
                <div className="grid grid-cols-8 gap-2">
                  {EMOJI_SET.map((s) => (
                    <button key={s} onClick={() => addSticker(s)} className="text-2xl">{s}</button>
                  ))}
                </div>
              </div>
            )}

            {panel === "music" && (
              <div className="space-y-3">
                <input value={musicQuery} onChange={(e) => setMusicQuery(e.target.value)} placeholder="Buscar música"
                  className="allow-select w-full h-10 px-3 rounded-xl bg-muted/60 text-[14px] outline-none" />
                {GLIMPSE_MUSIC.filter((t) => `${t.title} ${t.artist}`.toLowerCase().includes(musicQuery.toLowerCase())).map((t) => (
                  <button key={t.id} onClick={() => { setTrack(t); setTrackStart(0); setClipDuration(DEFAULT_GLIMPSE_MUSIC_CLIP_SECONDS); }}
                    className={`w-full flex items-center gap-3 p-2 rounded-2xl ${track?.id === t.id ? "bg-primary/15" : "bg-muted/40"}`}>
                    <span className="w-10 h-10 rounded-xl" style={{ background: t.gradient }} />
                    <span className="flex-1 text-left">
                      <span className="block text-[14px] font-medium">{t.title}</span>
                      <span className="block text-[12px] text-muted-foreground">{t.artist}</span>
                    </span>
                    {track?.id === t.id && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}
                {track && (
                  <div className="space-y-3 rounded-2xl bg-muted/40 p-3">
                    <label className="block text-[12px] text-muted-foreground">
                      Duración del fragmento: <span className="font-semibold text-foreground">{clipDuration}s</span>
                      <input
                        type="range"
                        min={MIN_GLIMPSE_MUSIC_CLIP_SECONDS}
                        max={MAX_GLIMPSE_MUSIC_CLIP_SECONDS}
                        step={1}
                        value={clipDuration}
                        onChange={(e) => {
                          const nextDuration = Number(e.target.value);
                          setClipDuration(nextDuration);
                          setTrackStart((start) => Math.min(start, Math.max(0, track.duration - nextDuration)));
                        }}
                        className="w-full accent-primary"
                      />
                    </label>
                    <label className="block text-[12px] text-muted-foreground">
                      Inicio del fragmento: <span className="font-semibold text-foreground">{Math.floor(trackStart)}s</span>
                      <input
                        type="range"
                        min={0}
                        max={Math.max(0, track.duration - clipDuration)}
                        value={Math.min(trackStart, Math.max(0, track.duration - clipDuration))}
                        onChange={(e) => setTrackStart(Number(e.target.value))}
                        className="w-full accent-primary"
                      />
                    </label>
                    <p className="text-[11px] text-muted-foreground">Se reproducen {clipDuration}s, del segundo {Math.floor(trackStart)} al {Math.floor(trackStart + clipDuration)}. Máximo permitido: 30s.</p>
                  </div>
                )}
                {track && (
                  <button onClick={() => setTrack(null)} className="text-[13px] text-destructive">Quitar música</button>
                )}
              </div>
            )}

            {panel === "filters" && (
              <div className="space-y-3">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {GLIMPSE_FILTERS.map((f) => (
                    <button key={f.id} onClick={() => setFilter(f.id)} className="flex-shrink-0 text-center">
                      <span className={`block w-16 h-16 rounded-2xl overflow-hidden mb-1 border-2 ${filter === f.id ? "border-primary" : "border-transparent"}`}>
                        {file && !isVideo ? (
                          <img src={mediaUrl!} alt={f.label} className="w-full h-full object-cover" style={{ filter: f.css(1) }} />
                        ) : (
                          <span className="block w-full h-full" style={{ background: bgColor, filter: f.css(1) }} />
                        )}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{f.label}</span>
                    </button>
                  ))}
                </div>
                <label className="block text-[12px] text-muted-foreground">Intensidad
                  <input type="range" min={0} max={1} step={0.05} value={filterIntensity}
                    onChange={(e) => setFilterIntensity(Number(e.target.value))} className="w-full accent-primary" />
                </label>
              </div>
            )}

            {panel === "adjust" && (
              <div className="space-y-2">
                {([
                  ["brightness", "Brillo", 50, 150],
                  ["contrast", "Contraste", 50, 150],
                  ["saturate", "Saturación", 0, 200],
                  ["sharpen", "Nitidez", 0, 100],
                  ["temperature", "Temperatura", -100, 100],
                  ["rotate", "Rotar", -180, 180],
                ] as const).map(([key, label, min, max]) => (
                  <label key={key} className="block text-[12px] text-muted-foreground">
                    {label}: {adjust[key]}
                    <input type="range" min={min} max={max} value={adjust[key]}
                      onChange={(e) => setAdjust({ ...adjust, [key]: Number(e.target.value) })}
                      className="w-full accent-primary" />
                  </label>
                ))}
                <button onClick={() => setAdjust(DEFAULT_ADJUST)} className="text-[13px] text-primary">Restablecer</button>
              </div>
            )}

            {panel === "draw" && (
              <div className="space-y-3">
                <div className="flex gap-2 overflow-x-auto">
                  {TEXT_COLORS.map((c) => (
                    <button key={c} onClick={() => { setBrushColor(c); setEraser(false); }}
                      className={`w-7 h-7 rounded-full flex-shrink-0 border-2 ${brushColor === c && !eraser ? "border-primary" : "border-white/30"}`}
                      style={{ background: c }} />
                  ))}
                </div>
                <label className="block text-[12px] text-muted-foreground">Grosor: {brushSize}px
                  <input type="range" min={2} max={36} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-full accent-primary" />
                </label>
                <div className="flex gap-2">
                  <button onClick={() => setEraser((v) => !v)} className={`flex-1 h-10 rounded-xl flex items-center justify-center gap-1.5 text-[13px] ${eraser ? "bg-primary text-primary-foreground" : "bg-muted/60"}`}>
                    <Eraser className="w-4 h-4" /> Borrador
                  </button>
                  <button onClick={clearDraw} className="flex-1 h-10 rounded-xl bg-muted/60 flex items-center justify-center gap-1.5 text-[13px]">
                    <Undo2 className="w-4 h-4" /> Limpiar
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom action bar */}
      <div className="h-[92px] px-4 flex items-center justify-between bg-black">
        <button onClick={() => setPanel("share")} className="flex items-center gap-2 px-4 h-11 rounded-full liquid-glass text-white text-[13px] font-medium">
          {PRIVACY_OPTIONS.find((p) => p.id === privacy)?.label}
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={publish}
          disabled={publishing || (!file && !plainText.trim())}
          className="flex items-center gap-2 px-6 h-12 rounded-full bg-primary text-primary-foreground text-[15px] font-semibold disabled:opacity-40"
        >
          {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Compartir Glimpse
        </button>
      </div>

      {/* Share sheet */}
      <AnimatePresence>
        {panel === "share" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 bg-black/60 flex items-end" onClick={() => setPanel(null)}>
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-t-3xl bg-background p-5 space-y-2">
              <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-3" />
              <p className="text-[15px] font-semibold mb-2">Privacidad del Glimpse</p>
              {PRIVACY_OPTIONS.map((p) => (
                <button key={p.id} onClick={() => { setPrivacy(p.id); setPanel(null); }}
                  className={`w-full text-left p-3 rounded-2xl flex items-center justify-between ${privacy === p.id ? "bg-primary/15" : "bg-muted/40"}`}>
                  <span>
                    <span className="block text-[14px] font-medium">{p.label}</span>
                    <span className="block text-[12px] text-muted-foreground">{p.description}</span>
                  </span>
                  {privacy === p.id && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))}
              {!isVideo && (
                <label className="block text-[12px] text-muted-foreground pt-2">Duración: {duration}s
                  <input type="range" min={3} max={15} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full accent-primary" />
                </label>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default GlimpseEditor;