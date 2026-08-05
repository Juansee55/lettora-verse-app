import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  X, SwitchCamera, Zap, ZapOff, Timer, Grid3X3, Image as ImageIcon, CircleDot,
} from "lucide-react";

interface Props {
  onCapture: (file: File) => void;
  onClose: () => void;
  onOpenGallery: () => void;
}

const TIMERS = [0, 3, 10];

const GlimpseCamera = ({ onCapture, onClose, onOpenGallery }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startYRef = useRef<number | null>(null);

  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [mode, setMode] = useState<"photo" | "video">("photo");
  const [flash, setFlash] = useState<"auto" | "on" | "off">("off");
  const [timer, setTimer] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [grid, setGrid] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [exposure, setExposure] = useState(0);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flashPulse, setFlashPulse] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        stopStream();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 1920 } },
          audio: true,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        setError("No se pudo acceder a la cámara. Revisa los permisos del dispositivo.");
      }
    })();
    return () => { cancelled = true; };
  }, [facing, stopStream]);

  useEffect(() => () => stopStream(), [stopStream]);

  useEffect(() => {
    if (!recording) return;
    const i = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(i);
  }, [recording]);

  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (flash === "on") { setFlashPulse(true); setTimeout(() => setFlashPulse(false), 220); }
    const canvas = document.createElement("canvas");
    const vw = video.videoWidth, vh = video.videoHeight;
    const cropW = vw / zoom, cropH = vh / zoom;
    canvas.width = cropW; canvas.height = cropH;
    const ctx = canvas.getContext("2d")!;
    ctx.filter = `brightness(${100 + exposure}%)`;
    if (facing === "user") { ctx.translate(cropW, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, (vw - cropW) / 2, (vh - cropH) / 2, cropW, cropH, 0, 0, cropW, cropH);
    canvas.toBlob((blob) => {
      if (blob) onCapture(new File([blob], `glimpse-${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  }, [exposure, facing, flash, onCapture, zoom]);

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const rec = new MediaRecorder(streamRef.current, { mimeType: mime, videoBitsPerSecond: 2_500_000 });
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      onCapture(new File([blob], `glimpse-${Date.now()}.webm`, { type: "video/webm" }));
    };
    rec.start();
    recorderRef.current = rec;
    setRecording(true);
    setElapsed(0);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  const trigger = () => {
    if (mode === "video") { recording ? stopRecording() : startRecording(); return; }
    if (timer > 0) {
      setCountdown(timer);
      let left = timer;
      const i = setInterval(() => {
        left -= 1;
        setCountdown(left);
        if (left <= 0) { clearInterval(i); takePhoto(); }
      }, 1000);
      return;
    }
    takePhoto();
  };

  const handleTapFocus = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setFocusPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setTimeout(() => setFocusPoint(null), 800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      className="fixed inset-0 z-[120] bg-black flex flex-col"
    >
      <div
        className="relative flex-1 overflow-hidden"
        onClick={handleTapFocus}
        onTouchStart={(e) => { startYRef.current = e.touches[0].clientY; }}
        onTouchMove={(e) => {
          if (startYRef.current == null) return;
          const delta = startYRef.current - e.touches[0].clientY;
          setExposure(Math.max(-50, Math.min(50, delta / 4)));
        }}
        onTouchEnd={() => { startYRef.current = null; }}
      >
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-sm text-white/70">
            {error}
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transition-transform duration-200"
            style={{
              transform: `scale(${zoom}) ${facing === "user" ? "scaleX(-1)" : ""}`,
              filter: `brightness(${100 + exposure}%)`,
            }}
          />
        )}

        {flashPulse && <div className="absolute inset-0 bg-white animate-fade-out" />}

        {grid && (
          <div className="absolute inset-0 pointer-events-none">
            {[1, 2].map((i) => (
              <div key={`v${i}`} className="absolute top-0 bottom-0 w-px bg-white/25" style={{ left: `${(i * 100) / 3}%` }} />
            ))}
            {[1, 2].map((i) => (
              <div key={`h${i}`} className="absolute left-0 right-0 h-px bg-white/25" style={{ top: `${(i * 100) / 3}%` }} />
            ))}
          </div>
        )}

        {focusPoint && (
          <motion.div
            initial={{ scale: 1.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute w-16 h-16 rounded-xl border-2 border-primary pointer-events-none"
            style={{ left: focusPoint.x - 32, top: focusPoint.y - 32 }}
          />
        )}

        {countdown > 0 && (
          <motion.div key={countdown} initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center text-white text-7xl font-bold">
            {countdown}
          </motion.div>
        )}

        {/* Top controls */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <button onClick={(e) => { e.stopPropagation(); stopStream(); onClose(); }}
            className="w-10 h-10 rounded-full liquid-glass flex items-center justify-center">
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <button onClick={(e) => { e.stopPropagation(); setFlash(flash === "off" ? "auto" : flash === "auto" ? "on" : "off"); }}
              className="px-3 h-10 rounded-full liquid-glass flex items-center gap-1 text-white text-[12px]">
              {flash === "off" ? <ZapOff className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
              {flash === "auto" ? "Auto" : flash === "on" ? "On" : "Off"}
            </button>
            <button onClick={(e) => { e.stopPropagation(); setTimer(TIMERS[(TIMERS.indexOf(timer) + 1) % TIMERS.length]); }}
              className="px-3 h-10 rounded-full liquid-glass flex items-center gap-1 text-white text-[12px]">
              <Timer className="w-4 h-4" />{timer > 0 ? `${timer}s` : "Off"}
            </button>
            <button onClick={(e) => { e.stopPropagation(); setGrid((g) => !g); }}
              className={`w-10 h-10 rounded-full liquid-glass flex items-center justify-center ${grid ? "text-primary" : "text-white"}`}>
              <Grid3X3 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {recording && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-destructive/90 text-white text-[12px] font-semibold flex items-center gap-1.5">
            <CircleDot className="w-3.5 h-3.5 animate-pulse" />
            {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
          </div>
        )}

        {/* Zoom */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 h-40 flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
          <input
            type="range" min={1} max={4} step={0.1} value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-40 accent-primary rotate-[-90deg] origin-center"
          />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="pb-8 pt-4 px-6 bg-black">
        <div className="flex justify-center gap-6 mb-5">
          {(["photo", "video"] as const).map((m) => (
            <button key={m} onClick={() => !recording && setMode(m)}
              className={`text-[13px] font-semibold tracking-wide transition-colors ${mode === m ? "text-primary" : "text-white/50"}`}>
              {m === "photo" ? "FOTO" : "VIDEO"}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <button onClick={onOpenGallery} className="w-11 h-11 rounded-xl liquid-glass flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-white" />
          </button>

          <motion.button whileTap={{ scale: 0.9 }} onClick={trigger}
            className="w-[74px] h-[74px] rounded-full border-[4px] border-white flex items-center justify-center">
            <motion.span
              animate={recording ? { borderRadius: 10, width: 30, height: 30 } : { borderRadius: 999, width: 58, height: 58 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className={recording ? "bg-destructive block" : "bg-white block"}
            />
          </motion.button>

          <button onClick={() => setFacing(facing === "user" ? "environment" : "user")}
            className="w-11 h-11 rounded-xl liquid-glass flex items-center justify-center">
            <SwitchCamera className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default GlimpseCamera;