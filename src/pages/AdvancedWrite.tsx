import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Image,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Save,
  Send,
  ChevronDown,
  Users,
  Plus,
  Sparkles,
  Eye,
  Trash2,
  ChevronUp,
  StickyNote,
  BookOpen,
  Loader2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Chapter {
  id: string;
  dbId?: string;
  title: string;
  content: string;
  chapter_number: number;
  word_count: number;
  notes: string;
}

const genres = [
  "Romance", "Fantasía", "Misterio", "Poesía",
  "Drama", "Aventura", "Ciencia Ficción", "Terror",
];

const AdvancedWritePage = () => {
  const navigate = useNavigate();
  const { bookId } = useParams<{ bookId: string }>();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("Romance");
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  
  const [chapters, setChapters] = useState<Chapter[]>([
    { id: "1", title: "Capítulo 1", content: "", chapter_number: 1, word_count: 0, notes: "" }
  ]);
  const [activeChapterId, setActiveChapterId] = useState("1");
  const [showChapterPanel, setShowChapterPanel] = useState(false);
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!!bookId);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const activeChapter = chapters.find(c => c.id === activeChapterId) || chapters[0];

  // Load existing book data
  useEffect(() => {
    if (bookId) {
      loadBookData();
    }
  }, [bookId]);

  const loadBookData = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    const { data: bookData, error } = await supabase
      .from("books")
      .select("*")
      .eq("id", bookId)
      .eq("author_id", user.id)
      .single();

    if (error || !bookData) {
      toast({ title: "Error", description: "No se pudo cargar el libro.", variant: "destructive" });
      navigate("/profile");
      return;
    }

    setTitle(bookData.title);
    setDescription(bookData.description || "");
    setGenre(bookData.genre || "Romance");
    setCoverPreview(bookData.cover_url);
    setStatus((bookData.status as "draft" | "published") || "draft");

    // Load chapters
    const { data: chaptersData } = await supabase
      .from("chapters")
      .select("*")
      .eq("book_id", bookId!)
      .order("chapter_number", { ascending: true });

    if (chaptersData && chaptersData.length > 0) {
      setChapters(chaptersData.map(c => ({
        id: c.id,
        dbId: c.id,
        title: c.title,
        content: c.content || "",
        chapter_number: c.chapter_number,
        word_count: c.word_count || 0,
        notes: "",
      })));
      setActiveChapterId(chaptersData[0].id);
    }

    setIsLoading(false);
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setCoverPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const updateChapterContent = (content: string) => {
    setChapters(prev => prev.map(c => 
      c.id === activeChapterId 
        ? { ...c, content, word_count: content.split(/\s+/).filter(Boolean).length }
        : c
    ));
  };

  const updateChapterTitle = (newTitle: string) => {
    setChapters(prev => prev.map(c => 
      c.id === activeChapterId ? { ...c, title: newTitle } : c
    ));
  };

  const updateChapterNotes = (notes: string) => {
    setChapters(prev => prev.map(c => 
      c.id === activeChapterId ? { ...c, notes } : c
    ));
  };

  const addChapter = () => {
    const newChapter: Chapter = {
      id: Date.now().toString(),
      title: `Capítulo ${chapters.length + 1}`,
      content: "",
      chapter_number: chapters.length + 1,
      word_count: 0,
      notes: "",
    };
    setChapters(prev => [...prev, newChapter]);
    setActiveChapterId(newChapter.id);
    setShowChapterPanel(false);
  };

  const deleteChapter = (id: string) => {
    if (chapters.length <= 1) {
      toast({ title: "No se puede eliminar", description: "Debe haber al menos un capítulo.", variant: "destructive" });
      return;
    }
    const remaining = chapters.filter(c => c.id !== id);
    remaining.forEach((c, i) => c.chapter_number = i + 1);
    setChapters(remaining);
    if (activeChapterId === id) setActiveChapterId(remaining[0].id);
  };

  const moveChapter = (id: string, direction: "up" | "down") => {
    const index = chapters.findIndex(c => c.id === id);
    if ((direction === "up" && index === 0) || (direction === "down" && index === chapters.length - 1)) return;
    const newChapters = [...chapters];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newChapters[index], newChapters[swapIndex]] = [newChapters[swapIndex], newChapters[index]];
    newChapters.forEach((c, i) => c.chapter_number = i + 1);
    setChapters(newChapters);
  };

  const handleSave = async (saveStatus: "draft" | "published") => {
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    if (!title.trim()) {
      toast({ title: "Título requerido", description: "Añade un título a tu libro.", variant: "destructive" });
      setIsSaving(false);
      return;
    }

    try {
      if (bookId) {
        // Update existing book
        await supabase.from("books").update({
          title, description, genre,
          cover_url: coverPreview,
          status: saveStatus,
        }).eq("id", bookId);

        // Update/create chapters
        for (const chapter of chapters) {
          if (chapter.dbId) {
            await supabase.from("chapters").update({
              title: chapter.title,
              content: chapter.content,
              chapter_number: chapter.chapter_number,
              word_count: chapter.word_count,
              is_published: saveStatus === "published",
            }).eq("id", chapter.dbId);
          } else {
            const { data: newChapter } = await supabase.from("chapters").insert({
              book_id: bookId,
              title: chapter.title,
              content: chapter.content,
              chapter_number: chapter.chapter_number,
              word_count: chapter.word_count,
              is_published: saveStatus === "published",
            }).select().single();
            
            if (newChapter) {
              setChapters(prev => prev.map(c => 
                c.id === chapter.id ? { ...c, dbId: newChapter.id } : c
              ));
            }
          }
        }

        // Delete removed chapters
        if (bookId) {
          const currentDbIds = chapters.filter(c => c.dbId).map(c => c.dbId!);
          const { data: existingChapters } = await supabase
            .from("chapters")
            .select("id")
            .eq("book_id", bookId);
          
          if (existingChapters) {
            const toDelete = existingChapters.filter(c => !currentDbIds.includes(c.id));
            for (const ch of toDelete) {
              await supabase.from("chapters").delete().eq("id", ch.id);
            }
          }
        }
      } else {
        // Create new book
        const { data: newBook, error } = await supabase.from("books").insert({
          author_id: user.id,
          title: title || "Sin título",
          description, genre,
          cover_url: coverPreview,
          status: saveStatus,
        }).select().single();

        if (error || !newBook) throw error;

        await supabase.from("chapters").insert(
          chapters.map(c => ({
            book_id: newBook.id,
            title: c.title,
            content: c.content,
            chapter_number: c.chapter_number,
            word_count: c.word_count,
            is_published: saveStatus === "published",
          }))
        );
      }

      setLastSaved(new Date());
      toast({
        title: saveStatus === "published" ? "¡Publicado!" : "Guardado",
        description: saveStatus === "published"
          ? "Tu libro ya está disponible para los lectores."
          : "Tu borrador ha sido guardado.",
      });

      if (saveStatus === "published" && !bookId) navigate("/profile");
    } catch (error) {
      toast({ title: "Error", description: "No se pudo guardar.", variant: "destructive" });
    }
    setIsSaving(false);
  };

  const totalWordCount = chapters.reduce((acc, c) => acc + c.word_count, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* iOS Header */}
      <div className="ios-header">
        <div className="flex items-center justify-between px-4 h-[52px]">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-primary active:opacity-60">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-[17px]">Atrás</span>
          </button>
          <div className="flex items-center gap-2">
            {lastSaved && (
              <span className="text-[11px] text-muted-foreground">
                <Check className="w-3 h-3 inline mr-0.5" />
                {lastSaved.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <Button
              variant="ios-ghost"
              size="ios-sm"
              onClick={() => handleSave("draft")}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            </Button>
            <Button
              variant="ios"
              size="ios-sm"
              onClick={() => handleSave("published")}
              disabled={isSaving}
            >
              <Send className="w-4 h-4 mr-1" />
              Publicar
            </Button>
          </div>
        </div>
      </div>

      {/* Book Info Bar */}
      <div className="border-b border-border bg-card/50">
        <div className="px-4 py-3 flex items-center gap-3">
          {/* Cover thumbnail */}
          <input type="file" ref={fileInputRef} onChange={handleCoverUpload} accept="image/*" className="hidden" />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-12 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 cursor-pointer border border-border"
          >
            {coverPreview ? (
              <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Image className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <Input
              type="text"
              placeholder="Título del libro..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-[17px] font-semibold border-0 bg-transparent px-0 h-auto py-0 focus-visible:ring-0 font-display"
            />
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[12px] text-muted-foreground">{totalWordCount} palabras</span>
              <span className="text-[12px] text-muted-foreground">•</span>
              <span className="text-[12px] text-muted-foreground">{chapters.length} cap.</span>
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowGenreDropdown(!showGenreDropdown)}
              className="px-3 py-1.5 bg-secondary text-secondary-foreground text-[13px] rounded-full font-medium flex items-center gap-1"
            >
              {genre}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showGenreDropdown && (
              <div className="absolute top-full mt-1 right-0 bg-card rounded-xl shadow-lg border border-border p-1 z-50 min-w-[140px]">
                {genres.map((g) => (
                  <button
                    key={g}
                    onClick={() => { setGenre(g); setShowGenreDropdown(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-[13px] transition-colors ${
                      genre === g ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chapter Navigation Strip */}
      <div className="border-b border-border bg-background">
        <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto">
          {chapters.map((chapter) => (
            <button
              key={chapter.id}
              onClick={() => setActiveChapterId(chapter.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
                chapter.id === activeChapterId
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              Cap. {chapter.chapter_number}
            </button>
          ))}
          <button
            onClick={addChapter}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground active:scale-95"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setShowChapterPanel(!showChapterPanel)}
            className="flex-shrink-0 px-3 py-1.5 text-primary text-[13px] font-medium"
          >
            Gestionar
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Editor */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-5 py-6">
            {/* Chapter Title */}
            <Input
              type="text"
              placeholder="Título del capítulo..."
              value={activeChapter.title}
              onChange={(e) => updateChapterTitle(e.target.value)}
              className="text-[22px] font-display font-bold border-0 bg-transparent px-0 h-auto py-2 mb-2 focus-visible:ring-0"
            />

            {/* Minimal Formatting Bar */}
            <div className="flex items-center gap-0.5 py-2 mb-4 border-b border-border">
              <button className="p-2 rounded-lg hover:bg-muted active:bg-muted/80 transition-colors">
                <Bold className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="p-2 rounded-lg hover:bg-muted active:bg-muted/80 transition-colors">
                <Italic className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="p-2 rounded-lg hover:bg-muted active:bg-muted/80 transition-colors">
                <Heading1 className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="p-2 rounded-lg hover:bg-muted active:bg-muted/80 transition-colors">
                <Quote className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="p-2 rounded-lg hover:bg-muted active:bg-muted/80 transition-colors">
                <List className="w-4 h-4 text-muted-foreground" />
              </button>
              <div className="flex-1" />
              <button
                onClick={() => setShowNotesPanel(!showNotesPanel)}
                className={`p-2 rounded-lg transition-colors ${showNotesPanel ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"}`}
              >
                <StickyNote className="w-4 h-4" />
              </button>
            </div>

            {/* Content Editor */}
            <Textarea
              placeholder="Empieza a escribir tu capítulo aquí...

La primera línea es siempre la más importante. ¿Qué quieres que sienta el lector?"
              value={activeChapter.content}
              onChange={(e) => updateChapterContent(e.target.value)}
              className="min-h-[500px] border-0 bg-transparent px-0 resize-none focus-visible:ring-0 text-[17px] leading-[1.8] placeholder:text-muted-foreground/40"
            />

            {/* Word count */}
            <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-[13px] text-muted-foreground">
              <span>{activeChapter.word_count} palabras</span>
              <span>{activeChapter.content.length} caracteres</span>
            </div>
          </div>
        </main>

        {/* Notes Side Panel */}
        <AnimatePresence>
          {showNotesPanel && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-border bg-card overflow-y-auto hidden md:block"
            >
              <div className="p-4">
                <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <StickyNote className="w-4 h-4" />
                  Notas
                </h3>
                <Textarea
                  placeholder="Notas privadas para este capítulo..."
                  value={activeChapter.notes}
                  onChange={(e) => updateChapterNotes(e.target.value)}
                  className="min-h-[200px] bg-muted/30 resize-none text-[14px]"
                />
                <div className="mt-4">
                  <Textarea
                    placeholder="Descripción del libro..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-muted/30 resize-none text-[14px] min-h-[80px]"
                  />
                  <label className="text-[11px] text-muted-foreground mt-1 block">Sinopsis del libro</label>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Chapter Management Sheet */}
      <AnimatePresence>
        {showChapterPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={() => setShowChapterPanel(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl max-h-[70vh] overflow-y-auto"
            >
              <div className="p-4">
                <div className="ios-pull-indicator" />
                <h3 className="text-[17px] font-semibold text-center mb-4">Capítulos</h3>
                <div className="space-y-1">
                  {chapters.map((chapter, index) => (
                    <div
                      key={chapter.id}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        chapter.id === activeChapterId ? "bg-primary/10" : ""
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-[13px] font-bold">
                        {chapter.chapter_number}
                      </div>
                      <div className="flex-1 min-w-0" onClick={() => { setActiveChapterId(chapter.id); setShowChapterPanel(false); }}>
                        <p className="text-[15px] font-medium truncate">{chapter.title}</p>
                        <p className="text-[12px] text-muted-foreground">{chapter.word_count} palabras</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveChapter(chapter.id, "up")}
                          disabled={index === 0}
                          className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteChapter(chapter.id)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addChapter}
                  className="w-full mt-3 py-3 rounded-xl bg-primary/10 text-primary text-[15px] font-medium flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4" />
                  Nuevo capítulo
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdvancedWritePage;
