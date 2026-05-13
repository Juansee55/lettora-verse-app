import { useState, useEffect, useRef, useCallback } from "react";

interface LyricLine {
  time: number; // en segundos
  text: string;
}

interface SyncedLyricsState {
  currentLineIndex: number;
  isPlaying: boolean;
  currentTime: number;
}

/**
 * Hook para sincronizar letras con la reproducción de música
 */
export const useSyncedLyrics = (
  lyrics: LyricLine[] | undefined,
  audioRef: React.RefObject<HTMLAudioElement>
) => {
  const [state, setState] = useState<SyncedLyricsState>({
    currentLineIndex: 0,
    isPlaying: false,
    currentTime: 0,
  });

  const animationFrameRef = useRef<number>();

  // Actualizar línea actual basada en el tiempo de reproducción
  const updateCurrentLine = useCallback(() => {
    if (!audioRef.current || !lyrics || lyrics.length === 0) return;

    const currentTime = audioRef.current.currentTime;
    let currentLineIndex = 0;

    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (lyrics[i].time <= currentTime) {
        currentLineIndex = i;
        break;
      }
    }

    setState((prev) => ({
      ...prev,
      currentLineIndex,
      currentTime,
      isPlaying: !audioRef.current!.paused,
    }));

    animationFrameRef.current = requestAnimationFrame(updateCurrentLine);
  }, [lyrics, audioRef]);

  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    const handlePlay = () => {
      setState((prev) => ({ ...prev, isPlaying: true }));
      animationFrameRef.current = requestAnimationFrame(updateCurrentLine);
    };

    const handlePause = () => {
      setState((prev) => ({ ...prev, isPlaying: false }));
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

    const handleTimeUpdate = () => {
      if (state.isPlaying) {
        updateCurrentLine();
      }
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [updateCurrentLine, state.isPlaying]);

  return {
    currentLineIndex: state.currentLineIndex,
    isPlaying: state.isPlaying,
    currentTime: state.currentTime,
  };
};

/**
 * Parsear letras sincronizadas desde formato LRC
 * Formato: [00:12.00]Línea de letra
 */
export const parseLRC = (lrcText: string): LyricLine[] => {
  const lines: LyricLine[] = [];
  const regex = /\[(\d{2}):(\d{2})\.(\d{2})\](.*)/g;
  let match;

  while ((match = regex.exec(lrcText)) !== null) {
    const minutes = parseInt(match[1]);
    const seconds = parseInt(match[2]);
    const centiseconds = parseInt(match[3]);
    const time = minutes * 60 + seconds + centiseconds / 100;
    const text = match[4].trim();

    if (text) {
      lines.push({ time, text });
    }
  }

  return lines;
};
