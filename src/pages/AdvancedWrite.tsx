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
  AlignRight,
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
  FileText,
  Settings,
  Eye,
  Trash2,
  GripVertical,
  ChevronUp,
  StickyNote,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Chapter {
  id: string;
  title: string;
  content: string;
  chapter_number: number;
  word_count: number;
  notes: string;
}

const AdvancedWritePage = () => {
  const navigate = useNavigate();
  const { bookId } = useParams<{ bookId: string }>();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Book state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("Romance");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  
  // Chapters state
  const [chapters, setChapters] = useState<Chapter[]>([
    { id: "1", title: "Capítulo 1", content: "", chapter_number: 1, word_count: 0, notes: "" }
  ]);
  const [activeChapterId, setActiveChapterId] = useState("1");
  const [showChapterPanel, setShowChapterPanel] = useState(true);
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  
  // Editor state
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const activeChapter = chapters.find(c => c.id === activeChapterId) || chapters[0];

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      handleAutoSave();
    }, 30000);
    return () => clearInterval(interval);
  }, [chapters, title, description]);

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCoverPreview(e.target?.result as string);
      };
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

  const updateChapterTitle = (title: string) => {
    setChapters(prev => prev.map(c => 
      c.id === activeChapterId ? { ...c, title } : c
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
  };

  const deleteChapter = (id: string) => {
    if (chapters.length <= 1) {
      toast({
        title: "No se puede eliminar",
        description: "Debe haber al menos un capítulo.",
        variant: "destructive",
      });
      return;
    }
    setChapters(prev => prev.filter(c => c.id !== id));
    if (activeChapterId === id) {
      setActiveChapterId(chapters[0].id);
    }
  };

  const moveChapter = (id: string, direction: "up" | "down") => {
    const index = chapters.findIndex(c => c.id === id);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === chapters.length - 1)
    ) return;

    const newChapters = [...chapters];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newChapters[index], newChapters[swapIndex]] = [newChapters[swapIndex], newChapters[index]];
    
    // Update chapter numbers
    newChapters.forEach((c, i) => c.chapter_number = i + 1);
    setChapters(newChapters);
  };

  const handleAutoSave = async () => {
    setIsSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 500));
    setLastSaved(new Date());
    setIsSaving(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Necesitas iniciar sesión para guardar.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    try {
      if (bookId) {
        // Update existing book
        await supabase
          .from("books")
          .update({
            title,
            description,
            genre,
            cover_url: coverPreview,
            status,
          })
          .eq("id", bookId);
      } else {
        // Create new book
        const { data: newBook, error } = await supabase
          .from("books")
          .insert({
            author_id: user.id,
            title: title || "Sin título",
            description,
            genre,
            cover_url: coverPreview,
            status,
          })
          .select()
          .single();

        if (error) throw error;

        // Create chapters
        if (newBook) {
          await supabase.from("chapters").insert(
            chapters.map(c => ({
              book_id: newBook.id,
              title: c.title,
              content: c.content,
              chapter_number: c.chapter_number,
              word_count: c.word_count,
              is_published: status === "published",
            }))
          );
        }
      }

      setLastSaved(new Date());
      toast({
        title: status === "published" ? "¡Publicado!" : "Guardado",
        description: status === "published" 
          ? "Tu libro ya está disponible para los lectores."
          : "Tu borrador ha sido guardado.",
      });

      if (status === "published") {
        navigate("/profile");
      }
    } catch (error) {
      console.error("Error saving:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
    setIsSaving(false);
  };

  const insertFormatting = (format: string) => {
    // This would integrate with a rich text editor in a full implementation
    toast({
      title: "Formato aplicado",
      description: `Se aplicó: ${format}`,
    });
  };

  const totalWordCount = chapters.reduce((acc, c) => acc + c.word_count, 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border"
      >
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <Input
                  type="text"
                  placeholder="Título del libro..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-lg font-display font-bold border-0 bg-transparent px-0 h-auto py-0 focus-visible:ring-0"
                />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {isSaving ? (
                    <span>Guardando...</span>
                  ) : lastSaved ? (
                    <span>Guardado a las {lastSaved.toLocaleTimeString()}</span>
                  ) : null}
                  <span>•</span>
                  <span>{totalWordCount} palabras</span>
                  <span>•</span>
                  <span>{chapters.length} capítulos</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowNotesPanel(!showNotesPanel)}
              >
                <StickyNote className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setStatus("draft"); handleSave(); }}>
                <Save className="w-4 h-4 mr-2" />
                Guardar
              </Button>
              <Button variant="hero" size="sm" onClick={() => { setStatus("published"); handleSave(); }}>
                <Send className="w-4 h-4 mr-2" />
                Publicar
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="flex flex-1 overflow-hidden">
        {/* Chapters Panel */}
        <AnimatePresence>
          {showChapterPanel && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-r border-border bg-muted/30 overflow-y-auto"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-semibold text-sm">Capítulos</h3>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={addChapter}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Cover */}
                <div className="mb-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleCoverUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`aspect-[3/4] rounded-xl overflow-hidden cursor-pointer border-2 border-dashed transition-colors ${
                      coverPreview ? "border-transparent" : "border-border hover:border-primary"
                    }`}
                  >
                    {coverPreview ? (
                      <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/50">
                        <Image className="w-8 h-8 mb-2" />
                        <p className="text-xs">Añadir portada</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Chapter list */}
                <div className="space-y-1">
                  {chapters.map((chapter, index) => (
                    <motion.div
                      key={chapter.id}
                      layout
                      className={`group p-3 rounded-lg cursor-pointer transition-colors ${
                        chapter.id === activeChapterId
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => setActiveChapterId(chapter.id)}
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 opacity-50" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{chapter.title}</p>
                          <p className={`text-xs ${chapter.id === activeChapterId ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {chapter.word_count} palabras
                          </p>
                        </div>
                        <div className={`flex gap-1 opacity-0 group-hover:opacity-100 ${chapter.id === activeChapterId ? "opacity-100" : ""}`}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); moveChapter(chapter.id, "up"); }}
                            className="p-1 hover:bg-background/20 rounded"
                            disabled={index === 0}
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteChapter(chapter.id); }}
                            className="p-1 hover:bg-destructive/20 rounded text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Add chapter button */}
                <Button 
                  variant="outline" 
                  className="w-full mt-4" 
                  onClick={addChapter}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo capítulo
                </Button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Editor */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-6">
            {/* Formatting toolbar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1 p-2 bg-muted/50 rounded-xl mb-6 sticky top-0 z-10"
            >
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertFormatting("bold")}>
                <Bold className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertFormatting("italic")}>
                <Italic className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertFormatting("underline")}>
                <Underline className="w-4 h-4" />
              </Button>
              <div className="w-px h-6 bg-border mx-1" />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertFormatting("h1")}>
                <Heading1 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertFormatting("h2")}>
                <Heading2 className="w-4 h-4" />
              </Button>
              <div className="w-px h-6 bg-border mx-1" />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertFormatting("align-left")}>
                <AlignLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertFormatting("align-center")}>
                <AlignCenter className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertFormatting("align-right")}>
                <AlignRight className="w-4 h-4" />
              </Button>
              <div className="w-px h-6 bg-border mx-1" />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertFormatting("list")}>
                <List className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertFormatting("ordered-list")}>
                <ListOrdered className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertFormatting("quote")}>
                <Quote className="w-4 h-4" />
              </Button>
              <div className="w-px h-6 bg-border mx-1" />
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Image className="w-4 h-4" />
              </Button>
              <div className="flex-1" />
              <Button variant="ghost" size="sm" className="text-primary">
                <Sparkles className="w-4 h-4 mr-1" />
                Asistente IA
              </Button>
            </motion.div>

            {/* Chapter title */}
            <Input
              type="text"
              placeholder="Título del capítulo..."
              value={activeChapter.title}
              onChange={(e) => updateChapterTitle(e.target.value)}
              className="text-2xl font-display font-bold border-0 bg-transparent px-0 h-auto py-2 mb-4 focus-visible:ring-0"
            />

            {/* Content editor */}
            <Textarea
              placeholder="Empieza a escribir tu capítulo aquí...

Usa la barra de herramientas para dar formato a tu texto. Puedes usar negritas, cursivas, encabezados, listas y más.

Consejo: Guarda frecuentemente con Ctrl+S o el botón de guardar."
              value={activeChapter.content}
              onChange={(e) => updateChapterContent(e.target.value)}
              className="min-h-[500px] border-0 bg-transparent px-0 resize-none focus-visible:ring-0 text-lg leading-relaxed"
            />

            {/* Word count */}
            <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
              <span>{activeChapter.word_count} palabras en este capítulo</span>
              <span>{activeChapter.content.length} caracteres</span>
            </div>
          </div>
        </main>

        {/* Notes Panel */}
        <AnimatePresence>
          {showNotesPanel && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-border bg-muted/30 overflow-y-auto"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-semibold text-sm flex items-center gap-2">
                    <StickyNote className="w-4 h-4" />
                    Notas del capítulo
                  </h3>
                </div>
                <Textarea
                  placeholder="Escribe notas, ideas o recordatorios para este capítulo...

Estas notas son privadas y no se publicarán."
                  value={activeChapter.notes}
                  onChange={(e) => updateChapterNotes(e.target.value)}
                  className="min-h-[300px] bg-card/50 resize-none"
                />

                <div className="mt-6">
                  <h4 className="font-medium text-sm mb-3">Configuración</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Género</span>
                      <Button variant="outline" size="sm" className="rounded-full">
                        {genre}
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      <Users className="w-4 h-4 mr-2" />
                      Invitar colaboradores
                    </Button>
                    <Button variant="outline" size="sm" className="w-full">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Añadir a saga
                    </Button>
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdvancedWritePage;
