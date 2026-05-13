import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Volume2, SkipBack, SkipForward } from "lucide-react";

interface MusicPlayerProps {
  videoId: string;
  title: string;
  artist: string;
  startTime: number;
  duration: number;
  onTimeUpdate?: (time: number) => void;
}

const MusicPlayer = ({
  videoId,
  title,
  artist,
  startTime,
  duration,
  onTimeUpdate,
}: MusicPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.currentTime = startTime;
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime - startTime;
      if (time >= 0 && time <= duration) {
        setCurrentTime(time);
        onTimeUpdate?.(time);
      } else if (time > duration) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const progressPercentage = (currentTime / duration) * 100;

  return (
    <div className="w-full space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="h-1 bg-muted/50 rounded-full overflow-hidden backdrop-blur-sm">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-accent"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ type: "tween", duration: 0.1 }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, "0")}</span>
          <span>{Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, "0")}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button className="p-2 hover:bg-muted/50 rounded-full transition-colors">
          <SkipBack className="w-5 h-5 text-muted-foreground" />
        </button>

        <motion.button
          onClick={togglePlay}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-shadow"
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 ml-0.5" />
          ) : (
            <Play className="w-6 h-6 ml-1" />
          )}
        </motion.button>

        <button className="p-2 hover:bg-muted/50 rounded-full transition-colors">
          <SkipForward className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-3">
        <Volume2 className="w-4 h-4 text-muted-foreground" />
        <input
          type="range"
          min="0"
          max="100"
          defaultValue="70"
          onChange={(e) => {
            if (audioRef.current) {
              audioRef.current.volume = parseInt(e.target.value) / 100;
            }
          }}
          className="flex-1 h-1 bg-muted rounded-full cursor-pointer"
        />
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        crossOrigin="anonymous"
      >
        <source
          src={`https://www.youtube.com/embed/${videoId}`}
          type="audio/mpeg"
        />
      </audio>
    </div>
  );
};

export default MusicPlayer;
