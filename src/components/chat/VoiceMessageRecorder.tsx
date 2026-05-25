import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Send, X, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceMessage } from "@/hooks/useVoiceMessage";

interface VoiceMessageRecorderProps {
  onSendVoice: (audioBlob: Blob, duration: number) => Promise<void>;
  disabled?: boolean;
}

const VoiceMessageRecorder = ({ onSendVoice, disabled = false }: VoiceMessageRecorderProps) => {
  const [showRecorder, setShowRecorder] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sending, setSending] = useState(false);
  const {
    isRecording,
    isPreparing,
    duration,
    audioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    cancelRecording,
    formatDuration,
  } = useVoiceMessage();

  const handleSendVoice = async () => {
    if (!audioBlob) return;

    setSending(true);
    try {
      await onSendVoice(audioBlob, duration);
      cancelRecording();
      setShowRecorder(false);
    } catch (error) {
      console.error("Error sending voice message:", error);
    } finally {
      setSending(false);
    }
  };

  const handlePlayAudio = () => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);

      audio.onended = () => {
        setIsPlaying(false);
      };
    }
  };

  return (
    <>
      {/* Botón de micrófono */}
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full h-10 w-10"
        onClick={() => setShowRecorder(true)}
        disabled={disabled || isPreparing}
      >
        <Mic className="w-5 h-5 text-primary" />
      </Button>

      {/* Modal de grabación */}
      <AnimatePresence>
        {showRecorder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end"
            onClick={() => {
              if (!isRecording && !audioBlob) {
                setShowRecorder(false);
              }
            }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full ios-sheet p-6 rounded-t-3xl"
            >
              <div className="ios-pull-indicator" />

              {!audioBlob ? (
                // Estado de grabación
                <div className="text-center py-8">
                  <h3 className="text-lg font-semibold mb-4">Grabar Mensaje de Voz</h3>

                  {isRecording && (
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center"
                    >
                      <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
                        <Mic className="w-6 h-6 text-white" />
                      </div>
                    </motion.div>
                  )}

                  <p className="text-2xl font-bold text-primary mb-6">
                    {formatDuration(duration)}
                  </p>

                  <p className="text-muted-foreground mb-6">
                    {isRecording
                      ? "Grabando... (máximo 5 minutos)"
                      : "Presiona el botón para comenzar"}
                  </p>

                  <div className="flex gap-3 justify-center">
                    {!isRecording ? (
                      <Button
                        variant="ios"
                        size="lg"
                        className="h-12 px-8 rounded-full"
                        onClick={startRecording}
                        disabled={isPreparing}
                      >
                        <Mic className="w-5 h-5 mr-2" />
                        {isPreparing ? "Preparando..." : "Grabar"}
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="ios"
                          size="lg"
                          className="h-12 px-8 rounded-full"
                          onClick={stopRecording}
                        >
                          Detener
                        </Button>
                        <Button
                          variant="ios-secondary"
                          size="lg"
                          className="h-12 px-8 rounded-full"
                          onClick={cancelRecording}
                        >
                          <X className="w-5 h-5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                // Estado de reproducción
                <div className="text-center py-8">
                  <h3 className="text-lg font-semibold mb-4">Reproducir y Enviar</h3>

                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center"
                  >
                    <button
                      onClick={handlePlayAudio}
                      className="w-16 h-16 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors"
                    >
                      {isPlaying ? (
                        <Pause className="w-6 h-6 text-white" />
                      ) : (
                        <Play className="w-6 h-6 text-white ml-1" />
                      )}
                    </button>
                  </motion.div>

                  <p className="text-lg font-semibold text-primary mb-2">
                    {formatDuration(duration)}
                  </p>

                  <p className="text-muted-foreground mb-6">
                    Toca para reproducir antes de enviar
                  </p>

                  <div className="flex gap-3 justify-center">
                    <Button
                      variant="ios"
                      size="lg"
                      className="h-12 px-8 rounded-full flex-1"
                      onClick={handleSendVoice}
                      disabled={sending}
                    >
                      <Send className="w-5 h-5 mr-2" />
                      {sending ? "Enviando..." : "Enviar"}
                    </Button>
                    <Button
                      variant="ios-secondary"
                      size="lg"
                      className="h-12 px-8 rounded-full"
                      onClick={cancelRecording}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default VoiceMessageRecorder;
