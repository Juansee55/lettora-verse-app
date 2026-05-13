import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, Plus, X, Play, Pause, Volume2, Search, Loader2, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Note {
  id: string;
  user_id: string;
  content: string;
  song?: {
    title: string;
    artist: string;
    videoId: string;
    lyrics?: string;
    startTime: number;
    duration: number;
  };
  created_at: string;
  expires_at: string;
  user?: {
    username: string;
    avatar_url: string;
  };
}

const NotesSection = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [noteText, setNoteText] = useState("");
  const [selectedSong, setSelectedSong] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUser(user);
    });
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    loadNotes();
  }, [currentUser]);

  const loadNotes = async () => {
    try {
      const { data, error } = await supabase
        .from("user_notes")
        .select("*")
        .eq("user_id", currentUser.id)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      console.error("Error loading notes:", err);
    }
  };

  const searchYouTube = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setSearchResults([
        {
          id: "dQw4w9WgXcQ",
          title: query,
          artist: "Official Artist",
          thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg",
          duration: 213,
        },
        {
          id: "9bZkp7q19f0",
          title: query + " (Remix)",
          artist: "Remix Artist",
          thumbnail: "https://img.youtube.com/vi/9bZkp7q19f0/default.jpg",
          duration: 252,
        },
      ]);
    } catch (error) {
      toast.error("Error al buscar canciones");
    } finally {
      setIsSearching(false);
    }
  };

  const selectSong = (song: any) => {
    setSelectedSong(song);
    setSearchQuery("");
    setSearchResults([]);
    setStartTime(0);
  };

  const createNote = async () => {
    if (!noteText.trim() || noteText.length > 80) {
      toast.error("La nota debe tener entre 1 y 80 caracteres");
      return;
    }

    try {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const { error } = await supabase.from("user_notes").insert({
        user_id: currentUser.id,
        content: noteText,
        song: selectedSong
          ? {
              title: selectedSong.title,
              artist: selectedSong.artist,
              videoId: selectedSong.id,
              startTime,
              duration: 30,
            }
          : null,
        expires_at: expiresAt.toISOString(),
      });

      if (error) throw error;

      toast.success("¡Nota creada!");
      setNoteText("");
      setSelectedSong(null);
      setStartTime(0);
      setShowCreateModal(false);
      loadNotes();
    } catch (err) {
      console.error("Error creating note:", err);
      toast.error("Error al crear la nota");
    }
  };

  const togglePlayPause = () => {
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

  return (
    <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-b from-background/80 to-background/40 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Music className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Notas</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-full hover:bg-primary/10"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Notes Carousel */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {notes.length === 0 ? (
          <div className="text-center text-muted-foreground text-xs py-3 w-full">
            Sin notas aún
          </div>
        ) : (
          notes.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-shrink-0 w-20 h-28 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-white/20 p-2 cursor-pointer hover:border-primary/50 transition-all backdrop-blur-sm"
              onClick={() => setCurrentNote(note)}
            >
              <div className="h-full flex flex-col justify-between">
                <p className="text-xs line-clamp-3 font-medium">{note.content}</p>
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

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full bg-background rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto border-t border-white/10"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Nueva Nota</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-muted rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Note Text Input */}
              <div className="mb-6">
                <div className="relative">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value.slice(0, 80))}
                    placeholder="¿Qué estás pensando? (máx. 80 caracteres)"
                    className="w-full bg-muted/50 rounded-2xl p-4 text-base resize-none border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                    rows={3}
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
                    {noteText.length}/80
                  </div>
                </div>
              </div>

              {/* Song Selector */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-3">Añadir Canción (Opcional)</h3>

                {!selectedSong ? (
                  <div>
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Buscar canción en YouTube..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          if (e.target.value) searchYouTube(e.target.value);
                        }}
                        className="pl-10 bg-muted/50 border-white/10"
                      />
                    </div>

                    {isSearching && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    )}

                    {searchResults.length > 0 && (
                      <div className="space-y-2">
                        {searchResults.map((song) => (
                          <motion.button
                            key={song.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => selectSong(song)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-white/10"
                          >
                            <img
                              src={song.thumbnail}
                              alt={song.title}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                            <div className="flex-1 text-left">
                              <p className="text-sm font-medium line-clamp-1">{song.title}</p>
                              <p className="text-xs text-muted-foreground">{song.artist}</p>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-muted/30 rounded-2xl p-4 border border-white/10">
                    <div className="flex items-start gap-3 mb-4">
                      <img
                        src={selectedSong.thumbnail}
                        alt={selectedSong.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{selectedSong.title}</p>
                        <p className="text-xs text-muted-foreground">{selectedSong.artist}</p>
                        <button
                          onClick={() => setSelectedSong(null)}
                          className="text-xs text-primary hover:underline mt-2"
                        >
                          Cambiar canción
                        </button>
                      </div>
                    </div>

                    {/* Time Selector */}
                    <div className="mb-4">
                      <label className="text-xs font-medium mb-2 block">
                        Selecciona dónde comienza el fragmento de 30s
                      </label>
                      <input
                        type="range"
                        min="0"
                        max={Math.max(0, selectedSong.duration - 30)}
                        value={startTime}
                        onChange={(e) => setStartTime(parseInt(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-2">
                        <span>{Math.floor(startTime / 60)}:{String(startTime % 60).padStart(2, "0")}</span>
                        <span>30s</span>
                      </div>
                    </div>

                    {/* Preview Player */}
                    <button
                      onClick={togglePlayPause}
                      className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl py-2 transition-colors"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-4 h-4" />
                          Pausar
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 ml-0.5" />
                          Escuchar fragmento
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Create Button */}
              <Button
                onClick={createNote}
                disabled={!noteText.trim()}
                className="w-full rounded-xl h-12 font-semibold"
              >
                Crear Nota
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Note Detail Modal */}
      <AnimatePresence>
        {currentNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full bg-background rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto border-t border-white/10"
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

                {/* Time Remaining */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <Clock className="w-4 h-4" />
                  <span>Expira en 24 horas</span>
                </div>

                {/* Song Section */}
                {currentNote.song && (
                  <div className="bg-muted/30 rounded-2xl p-4 border border-white/10">
                    <div className="mb-4">
                      <h3 className="font-semibold text-sm">{currentNote.song.title}</h3>
                      <p className="text-xs text-muted-foreground">{currentNote.song.artist}</p>
                    </div>

                    {/* Player */}
                    <div className="flex items-center gap-3 mb-4">
                      <button className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary/90">
                        <Play className="w-5 h-5 ml-0.5" />
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
