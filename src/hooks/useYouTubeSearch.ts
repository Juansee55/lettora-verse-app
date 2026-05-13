import { useState, useCallback } from "react";

interface YouTubeSearchResult {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
}

/**
 * Hook para buscar canciones en YouTube
 * En producción, usar YouTube Data API v3
 */
export const useYouTubeSearch = () => {
  const [results, setResults] = useState<YouTubeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // En producción: usar YouTube Data API v3
      // const response = await fetch(`https://www.googleapis.com/youtube/v3/search?...`);
      
      // Simulación para desarrollo
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setResults([
        {
          id: "dQw4w9WgXcQ",
          title: query,
          artist: "Official Artist",
          thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg",
          duration: "3:33"
        },
        {
          id: "9bZkp7q19f0",
          title: query + " (Remix)",
          artist: "Remix Artist",
          thumbnail: "https://img.youtube.com/vi/9bZkp7q19f0/default.jpg",
          duration: "4:20"
        }
      ]);
    } catch (err) {
      setError("Error al buscar canciones");
      console.error("YouTube search error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, search };
};

/**
 * Hook para obtener letras de canciones
 * Usar API como Genius o MusixMatch
 */
export const useLyricsSearch = () => {
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getLyrics = useCallback(async (title: string, artist: string) => {
    setLoading(true);
    try {
      // En producción: usar Genius API o MusixMatch API
      // const response = await fetch(`https://api.genius.com/search?q=${query}`);
      
      // Simulación para desarrollo
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setLyrics(`[Verso 1]
${artist} - ${title}
Letras de la canción aquí...

[Coro]
Coro de la canción...

[Verso 2]
Segundo verso...`);
    } catch (err) {
      console.error("Lyrics search error:", err);
      setLyrics(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { lyrics, loading, getLyrics };
};
