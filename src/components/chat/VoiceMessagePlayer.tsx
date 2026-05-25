import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoiceMessagePlayerProps {
  audioUrl: string;
  duration: number;
  sender: string;
  timestamp: string;
  isOwn?: boolean;
}

const VoiceMessagePlayer = ({
  audioUrl,
  duration,
  sender,
  timestamp,
  isOwn = false,
}: VoiceMessagePlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `voice-message-${Date.now()}.webm`;
    a.click();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = (currentTime / duration) * 100;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-2xl ${
        isOwn
          ? "bg-primary/20 rounded-br-none"
          : "bg-muted/60 rounded-bl-none"
      }`}
    >
      <audio ref={audioRef} src={audioUrl} />

      {/* Play/Pause Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handlePlayPause}
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
          isOwn
            ? "bg-primary hover:bg-primary/90"
            : "bg-background hover:bg-background/80"
        }`}
      >
        {isPlaying ? (
          <Pause className={`w-5 h-5 ${isOwn ? "text-white" : "text-primary"}`} />
        ) : (
          <Play className={`w-5 h-5 ml-0.5 ${isOwn ? "text-white" : "text-primary"}`} />
        )}
      </motion.button>

      {/* Progress Bar */}
      <div className="flex-1 min-w-0">
        <div className="w-full h-1.5 bg-background/50 rounded-full overflow-hidden mb-1">
          <motion.div
            className={`h-full ${isOwn ? "bg-primary" : "bg-primary/70"}`}
            animate={{ width: `${progress}%` }}
            transition={{ type: "tween", duration: 0.1 }}
          />
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground font-medium">
            {formatTime(currentTime)}
          </span>
          <span className="text-muted-foreground/70">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Download Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 flex-shrink-0"
        onClick={handleDownload}
      >
        <Download className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default VoiceMessagePlayer;
