import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, Plus, X, Play, Pause, Volume2, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Note {
  id: string;
  content: string;
  song?: {
    title: string;
    artist: string;
    videoId: string;
    lyrics?: string;
  };
  createdAt: Date;
}

const NotesSection = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Simulación de búsqueda en YouTube (en producción, usar API real)
  const searchYouTube = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      // Aquí iría la integración real con YouTube API
      // Por ahora, simulamos resultados
      await new Promise(resolve => setTimeout(resolve, 800));
      setSearchResults([
        {
          id: "dQw4w9WgXcQ",
          title: query + " - Official Video",
          artist: "Artist Name",
          thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg"
        }
      ]);
    } catch (error) {
      toast.error("Error al buscar canciones");
    } finally {
      setIsSearching(false);
    }
  };

  const selectSong = (song: any) => {
    // Aquí se integraría la obtención de letras desde una API como Genius
    setCurrentNote(prev => prev ? {
      ...prev,
      song: {
        title: song.title,
        artist: song.artist,
        videoId: song.id,
        lyrics: "Letras de la canción aquí..."
      }
    } : null);
    setSearchQuery("");
    setSearchResults([]);
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="px-4 py-3 border-b border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Music className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold">Notas</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-full"
          onClick={() => setShowNoteModal(true)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Notes Carousel */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {notes.length === 0 ? (
          <div className="text-center text-muted-foreground text-xs py-4 w-full">
            Sin notas aún
          </div>
        ) : (
          notes.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-shrink-0 w-20 h-28 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-white/10 p-2 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setCurrentNote(note)}
            >
              <div className="h-full flex flex-col justify-between">
                <p className="text-xs line-clamp-3">{note.content}</p>
                {note.song && (
                  <div className="text-[10px] text-muted-foreground truncate">
                    {note.song.title}
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Note Detail Modal */}
      <AnimatePresence>
        {currentNote && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            className="fixed inset-0 z-50 flex items-end"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setCurrentNote(null)}
            />

            {/* Content */}
            <motion.div
              className="relative w-full bg-background rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto"
              initial={{ y: 100 }}
              animate={{ y: 0 }}
            >
              <button
                onClick={() => setCurrentNote(null)}
                className="absolute top-4 right-4 p-2 hover:bg-muted rounded-full"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Note Content */}
              <div className="mb-6">
                <p className="text-lg font-semibold mb-4">{currentNote.content}</p>

                {/* Song Section */}
                {currentNote.song ? (
                  <div className="bg-muted/50 rounded-2xl p-4 mb-4">
                    <div className="mb-4">
                      <h3 className="font-semibold text-sm">{currentNote.song.title}</h3>
                      <p className="text-xs text-muted-foreground">{currentNote.song.artist}</p>
                    </div>

                    {/* Player */}
                    <div className="flex items-center gap-3 mb-4">
                      <button
                        onClick={togglePlayPause}
                        className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary/90"
                      >
                        {isPlaying ? (
                          <Pause className="w-5 h-5" />
                        ) : (
                          <Play className="w-5 h-5 ml-0.5" />
                        )}
                      </button>
                      <div className="flex-1 h-1 bg-muted rounded-full" />
                      <Volume2 className="w-4 h-4 text-muted-foreground" />
                    </div>

                    {/* Lyrics */}
                    {currentNote.song.lyrics && (
                      <div className="bg-background/50 rounded-lg p-3 max-h-40 overflow-y-auto">
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                          {currentNote.song.lyrics}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full mb-4"
                    onClick={() => {
                      // Mostrar búsqueda de canciones
                    }}
                  >
                    <Music className="w-4 h-4 mr-2" />
                    Añadir canción
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden audio element */}
      <audio ref={audioRef} />
    </div>
  );
};

export default NotesSection;
