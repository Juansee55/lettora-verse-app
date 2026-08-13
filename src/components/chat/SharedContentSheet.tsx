import { AnimatePresence, motion } from "framer-motion";
import { FolderOpen, Image as ImageIcon, Mic, Video, X } from "lucide-react";

export interface SharedChatMessage {
  id: string;
  content: string;
  created_at: string;
  media_url?: string | null;
  media_type?: string;
}

interface SharedContentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  messages: SharedChatMessage[];
}

const SharedContentSheet = ({ isOpen, onClose, messages }: SharedContentSheetProps) => {
  const mediaMessages = messages.filter((message) => Boolean(message.media_url));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/55 backdrop-blur-[2px]"
          onClick={onClose}
        >
          <motion.section
            initial={{ y: 32, opacity: 0, scale: 0.985 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 32, opacity: 0, scale: 0.985 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-t-[30px] border border-border/50 bg-card/95 pb-safe shadow-2xl backdrop-blur-2xl"
            aria-label="Contenido compartido"
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/25" />
            </div>

            <header className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-[16px] font-bold tracking-tight">Contenido compartido</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">Archivos enviados en esta conversación</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-2xl bg-muted/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
                aria-label="Cerrar contenido compartido"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="max-h-[60vh] overflow-y-auto px-4 pb-5">
              {mediaMessages.length === 0 ? (
                <div className="flex min-h-48 flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 bg-muted/25 px-6 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <FolderOpen className="h-5 w-5" />
                  </div>
                  <p className="text-[14px] font-semibold">Aún no hay archivos compartidos</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">Las fotos, vídeos y notas de voz que envíen aparecerán aquí.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {mediaMessages.map((message) => {
                    const isImage = message.media_type === "image";
                    const isVideo = message.media_type === "video";
                    const isVoice = message.media_type === "voice";
                    const label = new Date(message.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });

                    return (
                      <a
                        key={message.id}
                        href={message.media_url || undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative aspect-square overflow-hidden rounded-2xl border border-border/40 bg-muted/45 transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary/40"
                        aria-label={`Abrir contenido compartido del ${label}`}
                      >
                        {isImage ? (
                          <img src={message.media_url || ""} alt="Contenido compartido" className="h-full w-full object-cover" />
                        ) : isVideo ? (
                          <video src={message.media_url || ""} className="h-full w-full object-cover" preload="metadata" muted />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-2 px-2 text-center">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                              {isVoice ? <Mic className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                            </div>
                            <span className="text-[11px] font-medium text-muted-foreground">{isVoice ? "Audio" : "Archivo"}</span>
                          </div>
                        )}
                        {(isImage || isVideo) && (
                          <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100">
                            {isVideo ? <Video className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                            {label}
                          </div>
                        )}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SharedContentSheet;
