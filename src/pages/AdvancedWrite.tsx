import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
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
  CalendarClock,
  Maximize2,
  Minimize2,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BookConfigSection from "@/components/write/BookConfigSection";
import FormattingToolbar, { type WritingFormat } from "@/components/write/FormattingToolbar";
import SagaWorkspace from "@/components/write/SagaWorkspace";
import BookCollaboratorsModal from "@/components/books/BookCollaboratorsModal";

interface Chapter {
  id: string;
  dbId?: string;
  title: string;
  content: string;
  chapter_number: number;
  word_count: number;
  notes: string;
  publish_at?: string | null;
  is_published?: boolean;
}

interface LocalWriterDraft {
  title: string;
  description: string;
  genre: string;
  coverPreview: string | null;
  status: "draft" | "published";
  isSaga: boolean;
  tags: string[];
  ageRating: string;
  aiGenerated: boolean;
  requestVerification: boolean;
  chapters: Chapter[];
  wordGoal: number;
}

const genres = [
  "Romance", "Fantasía", "Misterio", "Poesía",
  "Drama", "Aventura", "Ciencia Ficción", "Terror",
  "No Ficción", "Biografía", "Autoayuda", "Historia",
  "Ficción Literaria", "Ficción Contemporánea", "Ficción Histórica",
  "Distopía", "Thriller", "Humor", "Infantil", "Juvenil",
  "Erótica", "Paranormal", "Cyberpunk", "Steampunk",
];

const AdvancedWritePage = () => {
  const navigate = useNavigate();
  const { bookId } = useParams<{ bookId: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("Romance");
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [isSaga, setIsSaga] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [ageRating, setAgeRating] = useState("all");
  const [aiGenerated, setAiGenerated] = useState(false);
  const [requestVerification, setRequestVerification] = useState(false);
  
  const [chapters, setChapters] = useState<Chapter[]>([
    { id: "1", title: "Capítulo 1", content: "", chapter_number: 1, word_count: 0, notes: "" }
  ]);
  const [activeChapterId, setActiveChapterId] = useState("1");
  const [showChapterPanel, setShowChapterPanel] = useState(false);
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!!bookId);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [localSavedAt, setLocalSavedAt] = useState<Date | null>(null);
  const [hasLocalDraft, setHasLocalDraft] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [wordGoal, setWordGoal] = useState(1000);
  const [setupStep, setSetupStep] = useState<1 | 2 | 3>(bookId ? 3 : 1);
  const [tagInput, setTagInput] = useState("");
  const [sagaId, setSagaId] = useState<string | null>(null);
  const [parentSagaId, setParentSagaId] = useState<string | null>(searchParams.get("sagaId"));
  const [isAuthor, setIsAuthor] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);

  const localDraftKey = `lettora.writer.v1.${bookId || "new"}`;
  const activeChapter = chapters.find(c => c.id === activeChapterId) || chapters[0];

  // Load existing book data
  useEffect(() => {
    if (bookId) {
      loadBookData();
    } else if (searchParams.get("sagaId")) {
      setSagaId(searchParams.get("sagaId"));
    }
  }, [bookId, searchParams]);

  useEffect(() => {
    if (isLoading || typeof window === "undefined") return;
    setHasLocalDraft(Boolean(window.localStorage.getItem(localDraftKey)));
  }, [isLoading, localDraftKey]);

  useEffect(() => {
    if (isLoading || hasLocalDraft || typeof window === "undefined") return;
    const hasWritingContent = Boolean(title.trim() || description.trim() || chapters.some((chapter) => chapter.content.trim()));
    if (!hasWritingContent) return;
    const timer = window.setTimeout(() => {
      const draft: LocalWriterDraft = {
        title,
        description,
        genre,
        coverPreview: coverPreview?.startsWith("data:") && coverPreview.length > 250_000 ? null : coverPreview,
        status,
        isSaga,
        tags,
        ageRating,
        aiGenerated,
        requestVerification,
        chapters,
        wordGoal,
      };
      try {
        window.localStorage.setItem(localDraftKey, JSON.stringify(draft));
        setLocalSavedAt(new Date());
      } catch {
        // El borrador principal sigue en memoria aunque el dispositivo no tenga cuota local.
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [isLoading, hasLocalDraft, localDraftKey, title, description, genre, coverPreview, status, isSaga, tags, ageRating, aiGenerated, requestVerification, chapters, wordGoal]);

  const restoreLocalDraft = () => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(localDraftKey);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as Partial<LocalWriterDraft>;
      if (typeof draft.title === "string") setTitle(draft.title);
      if (typeof draft.description === "string") setDescription(draft.description);
      if (typeof draft.genre === "string") setGenre(draft.genre);
      if (typeof draft.coverPreview === "string" || draft.coverPreview === null) setCoverPreview(draft.coverPreview ?? null);
      if (draft.status === "draft" || draft.status === "published") setStatus(draft.status);
      if (typeof draft.isSaga === "boolean") setIsSaga(draft.isSaga);
      if (Array.isArray(draft.tags)) setTags(draft.tags.filter((tag): tag is string => typeof tag === "string"));
      if (typeof draft.ageRating === "string") setAgeRating(draft.ageRating);
      if (typeof draft.aiGenerated === "boolean") setAiGenerated(draft.aiGenerated);
      if (typeof draft.requestVerification === "boolean") setRequestVerification(draft.requestVerification);
      if (Array.isArray(draft.chapters) && draft.chapters.length > 0) {
        setChapters(draft.chapters as Chapter[]);
        setActiveChapterId((draft.chapters[0] as Chapter).id);
      }
      if (typeof draft.wordGoal === "number" && draft.wordGoal > 0) setWordGoal(draft.wordGoal);
      setHasLocalDraft(false);
      toast({ title: "Borrador recuperado", description: "Se restauró la última versión guardada en este dispositivo." });
    } catch {
      window.localStorage.removeItem(localDraftKey);
      setHasLocalDraft(false);
    }
  };

  const dismissLocalDraft = () => {
    if (typeof window !== "undefined") window.localStorage.removeItem(localDraftKey);
    setHasLocalDraft(false);
  };

  const loadBookData = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    // Try as author first
    let { data: bookData, error } = await supabase
      .from("books")
      .select("*")
      .eq("id", bookId)
      .eq("author_id", user.id)
      .single();

    // If not author, check if collaborator
    if (error || !bookData) {
      const { data: collab } = await supabase
        .from("book_collaborators")
        .select("id, accepted_at")
        .eq("book_id", bookId!)
        .eq("user_id", user.id)
        .not("accepted_at", "is", null)
        .maybeSingle();

      if (collab) {
        const { data: collabBook } = await supabase
          .from("books")
          .select("*")
          .eq("id", bookId)
          .single();
        bookData = collabBook;
      }
    }

    if (!bookData) {
      toast({ title: "Error", description: "No se pudo cargar el libro.", variant: "destructive" });
      navigate("/profile");
      return;
    }

    setIsAuthor(bookData.author_id === user.id);
    setTitle(bookData.title);
    setDescription(bookData.description || "");
    setGenre(bookData.genre || "Romance");
    setCoverPreview(bookData.cover_url);
    setStatus((bookData.status as "draft" | "published") || "draft");
    setIsSaga(bookData.is_saga || false);
    setSagaId(bookData.is_saga ? bookData.id : bookData.parent_saga_id || null);
    setParentSagaId(bookData.parent_saga_id || null);
    setTags(bookData.tags || []);
    setAgeRating((bookData as any).age_rating || "all");
    setAiGenerated((bookData as any).ai_generated || false);
    setRequestVerification((bookData as any).verification_status === "pending");

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
        publish_at: c.publish_at || null,
        is_published: c.is_published || false,
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

  const applyFormat = (format: WritingFormat) => {
    const textarea = editorRef.current;
    if (!textarea || !activeChapter) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = activeChapter.content.slice(start, end);
    let replacement = selected;

    if (format === "bold") replacement = `<strong>${selected || "texto"}</strong>`;
    if (format === "italic") replacement = `<em>${selected || "texto"}</em>`;
    if (format === "underline") replacement = `<u>${selected || "texto"}</u>`;
    if (format === "heading") replacement = `<strong style="font-size:1.2em">${selected || "Título de sección"}</strong>`;
    if (format === "quote") replacement = `<em>“${selected || "Cita"}”</em>`;
    if (format === "bullet") replacement = selected ? selected.split("\\n").map(line => line.trim() ? `• ${line}` : line).join("\\n") : "• ";

    const nextContent = activeChapter.content.slice(0, start) + replacement + activeChapter.content.slice(end);
    updateChapterContent(nextContent);
    window.requestAnimationFrame(() => {
      editorRef.current?.focus();
      editorRef.current?.setSelectionRange(start, start + replacement.length);
    });
  };

  const handleEditorKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.metaKey || event.ctrlKey)) return;
    const shortcuts: Record<string, WritingFormat> = { b: "bold", i: "italic", u: "underline" };
    const format = shortcuts[event.key.toLowerCase()];
    if (!format) return;
    event.preventDefault();
    applyFormat(format);
  };

  const updateChapterPublishAt = (value: string) => {
    setChapters(prev => prev.map(c =>
      c.id === activeChapterId ? { ...c, publish_at: value || null } : c
    ));
  };

  const updateWordGoal = (value: string) => {
    const nextGoal = Number(value);
    if (Number.isFinite(nextGoal)) setWordGoal(Math.min(100000, Math.max(100, nextGoal)));
  };

  const addWriterTag = () => {
    const nextTag = tagInput.trim().toLowerCase().replace(/[^a-záéíóúñü0-9]/gi, "");
    if (nextTag && !tags.includes(nextTag) && tags.length < 5) {
      setTags((current) => [...current, nextTag]);
      setTagInput("");
    }
  };

  const continueSetup = () => {
    if (setupStep === 1 && !title.trim()) {
      toast({ title: "Añade un título", description: "El título ayuda a identificar tu proyecto.", variant: "destructive" });
      return;
    }
    setSetupStep((current) => Math.min(3, current + 1) as 1 | 2 | 3);
  };

  const addChapter = () => {
    const newChapter: Chapter = {
      id: Date.now().toString(),
      title: `Capítulo ${chapters.length + 1}`,
      content: "",
      chapter_number: chapters.length + 1,
      word_count: 0,
      notes: "",
      is_published: false,
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

  const duplicateChapter = (id: string) => {
    const source = chapters.find(c => c.id === id);
    if (!source) return;
    const newChapter: Chapter = {
      id: Date.now().toString(),
      title: `${source.title} (copia)`,
      content: source.content,
      chapter_number: chapters.length + 1,
      word_count: source.word_count,
      notes: source.notes,
      is_published: false,
    };
    setChapters(prev => [...prev, newChapter]);
    setActiveChapterId(newChapter.id);
    toast({ title: "Capítulo duplicado" });
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
          is_saga: isSaga,
          tags: tags.length > 0 ? tags : null,
          age_rating: ageRating,
          ai_generated: aiGenerated,
          verification_status: requestVerification ? "pending" : "not_requested",
        } as any).eq("id", bookId);

        // Update/create chapters
        for (const chapter of chapters) {
          if (chapter.dbId) {
            await supabase.from("chapters").update({
              title: chapter.title,
              content: chapter.content,
              chapter_number: chapter.chapter_number,
              word_count: chapter.word_count,
              is_published: saveStatus === "published" && (!chapter.publish_at || new Date(chapter.publish_at) <= new Date()),
              publish_at: chapter.publish_at || null,
              draft_content: saveStatus === "draft" ? chapter.content : null,
            }).eq("id", chapter.dbId);
          } else {
            const { data: newChapter } = await supabase.from("chapters").insert({
              book_id: bookId,
              title: chapter.title,
              content: chapter.content,
              chapter_number: chapter.chapter_number,
              word_count: chapter.word_count,
              is_published: saveStatus === "published" && (!chapter.publish_at || new Date(chapter.publish_at) <= new Date()),
              publish_at: chapter.publish_at || null,
              draft_content: saveStatus === "draft" ? chapter.content : null,
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
        let nextSagaOrder: number | null = null;
        if (parentSagaId) {
          const { count } = await supabase
            .from("books")
            .select("id", { count: "exact", head: true })
            .eq("parent_saga_id", parentSagaId);
          nextSagaOrder = (count || 0) + 1;
        }
        const { data: newBook, error } = await supabase.from("books").insert({
          author_id: user.id,
          title: title || "Sin título",
          description, genre,
          cover_url: coverPreview,
          status: saveStatus,
          is_saga: isSaga,
          parent_saga_id: parentSagaId,
          saga_order: nextSagaOrder,
          tags: tags.length > 0 ? tags : null,
          age_rating: ageRating,
          ai_generated: aiGenerated,
          verification_status: requestVerification ? "pending" : "not_requested",
        } as any).select().single();

        if (error || !newBook) throw error;
        setSagaId(isSaga ? newBook.id : parentSagaId);

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
      if (typeof window !== "undefined") window.localStorage.removeItem(localDraftKey);
      setHasLocalDraft(false);
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
            {!lastSaved && localSavedAt && (
              <span className="text-[11px] text-muted-foreground" title="Guardado local automático">
                <Check className="w-3 h-3 inline mr-0.5" /> Dispositivo
              </span>
            )}
            <button
              type="button"
              onClick={() => setFocusMode((value) => !value)}
              className="w-8 h-8 rounded-lg text-muted-foreground hover:bg-muted flex items-center justify-center"
              aria-label={focusMode ? "Salir del modo concentración" : "Activar modo concentración"}
              title={focusMode ? "Salir del modo concentración" : "Modo concentración"}
            >
              {focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
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

      <input type="file" ref={fileInputRef} onChange={handleCoverUpload} accept="image/*" className="hidden" />

      {/* Local recovery */}
      {hasLocalDraft && !focusMode && (
        <div className="mx-4 mt-3 rounded-2xl border border-primary/20 bg-primary/[0.06] px-3 py-2.5 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold">Hay un borrador en este dispositivo</p>
            <p className="text-[11px] text-muted-foreground">Puedes restaurarlo antes de continuar.</p>
          </div>
          <button type="button" onClick={restoreLocalDraft} className="text-[12px] font-semibold text-primary">Restaurar</button>
          <button type="button" onClick={dismissLocalDraft} className="text-[12px] text-muted-foreground">Descartar</button>
        </div>
      )}

      {/* Book Info Bar */}
      {!focusMode && (bookId || setupStep === 3) && <div className="border-b border-border bg-card/50">
        <div className="px-4 py-3 flex items-center gap-3">
          {/* Cover thumbnail */}
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
      </div>}

      {/* Chapter Navigation Strip */}
      {!focusMode && (bookId || setupStep === 3) && <div className="border-b border-border bg-background">
        <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto">
          {chapters.map((chapter) => (
                      <button
              key={chapter.id}
              title={chapter.title || `Capítulo ${chapter.chapter_number}`}
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
      </div>}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Editor */}
        <main className="flex-1 overflow-y-auto">
          {!bookId && setupStep < 3 ? (
            <div className="max-w-xl mx-auto px-5 py-10">
              <div className="mb-8 text-center">
                <p className="text-[11px] uppercase tracking-[0.18em] text-primary font-semibold">Nuevo proyecto</p>
                <h2 className="mt-2 text-[28px] font-display font-bold">Construye tu historia por etapas</h2>
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">Primero define la identidad del libro, después prepara su ficha y finalmente entra al manuscrito.</p>
              </div>
              <div className="flex items-center gap-2 mb-7">
                {["Identidad", "Ficha", "Manuscrito"].map((label, index) => {
                  const step = index + 1;
                  const active = step === setupStep;
                  const complete = step < setupStep;
                  return (
                    <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold ${active || complete ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{complete ? "✓" : step}</span>
                      <span className={`hidden sm:block text-[11px] font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
                      {step < 3 && <span className="h-px flex-1 bg-border" />}
                    </div>
                  );
                })}
              </div>

              {setupStep === 1 && (
                <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center"><BookOpen className="w-5 h-5 text-primary" /></div>
                    <div><h3 className="text-[17px] font-semibold">1. Identidad de la obra</h3><p className="text-[12px] text-muted-foreground">Elige cómo quieres que se presente.</p></div>
                  </div>
                  <label className="text-[12px] font-semibold text-muted-foreground">Título</label>
                  <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="El título de tu libro o novela" className="mt-2 h-12 rounded-2xl text-[17px]" />
                  <p className="mt-2 text-[11px] text-muted-foreground">Podrás editarlo después desde la ficha del proyecto.</p>
                  <div className="mt-5 flex items-center gap-3 rounded-2xl bg-muted/40 p-3">
                    <div className="w-12 h-16 rounded-xl bg-background flex items-center justify-center overflow-hidden border border-border flex-shrink-0">
                      {coverPreview ? <img src={coverPreview} alt="Vista previa de portada" className="w-full h-full object-cover" /> : <Image className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1"><p className="text-[13px] font-semibold">Portada</p><p className="text-[11px] text-muted-foreground">Añádela ahora o cuando tengas una versión definitiva.</p></div>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-xl bg-primary/10 text-primary px-3 py-2 text-[12px] font-semibold">Elegir</button>
                  </div>
                </section>
              )}

              {setupStep === 2 && (
                <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-2xl bg-violet-500/10 flex items-center justify-center"><Sparkles className="w-5 h-5 text-violet-500" /></div>
                    <div><h3 className="text-[17px] font-semibold">2. Ficha editorial</h3><p className="text-[12px] text-muted-foreground">Dale contexto a tus futuros lectores.</p></div>
                  </div>
                  <label className="text-[12px] font-semibold text-muted-foreground">Descripción o sinopsis</label>
                  <Textarea autoFocus value={description} onChange={(e) => setDescription(e.target.value)} placeholder="¿De qué trata esta obra? ¿Qué encontrará el lector?" className="mt-2 min-h-[150px] rounded-2xl resize-none text-[15px] leading-relaxed" />
                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className="text-[12px] font-semibold text-muted-foreground">Género</label><select value={genre} onChange={(e) => setGenre(e.target.value)} className="mt-2 w-full h-11 rounded-xl border border-input bg-background px-3 text-[13px]"><option value="Romance">Romance</option>{genres.filter((item) => item !== "Romance").map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
                    <div><label className="text-[12px] font-semibold text-muted-foreground">Etiquetas</label><div className="mt-2 flex gap-2"><Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addWriterTag(); } }} placeholder="#fantasía" className="h-11 rounded-xl" /><Button type="button" variant="ios-ghost" size="icon" onClick={addWriterTag} disabled={!tagInput.trim()}><Plus className="w-4 h-4" /></Button></div></div>
                  </div>
                  {tags.length > 0 && <div className="flex flex-wrap gap-2 mt-3">{tags.map((tag) => <button type="button" key={tag} onClick={() => setTags((current) => current.filter((item) => item !== tag))} className="rounded-full bg-primary/10 text-primary px-3 py-1 text-[11px] font-medium">#{tag} ×</button>)}</div>}
                </section>
              )}

              <div className="mt-6 flex items-center justify-between gap-3">
                <button type="button" onClick={() => setupStep === 1 ? navigate(-1) : setSetupStep(1)} className="px-4 py-2.5 rounded-xl text-[13px] font-semibold text-muted-foreground hover:bg-muted">{setupStep === 1 ? "Cancelar" : "Atrás"}</button>
                <Button type="button" onClick={continueSetup} className="rounded-xl px-5">{setupStep === 1 ? "Continuar con la ficha" : "Abrir manuscrito"}<ChevronDown className="w-4 h-4 ml-2 -rotate-90" /></Button>
              </div>
            </div>
          ) : (
          <div className="max-w-3xl mx-auto px-5 py-6">
            {sagaId && !focusMode && (
              <div className="md:hidden mb-5">
                <SagaWorkspace
                  sagaId={sagaId}
                  currentBookId={bookId}
                  onOpenVolume={(volumeId) => navigate(`/write/advanced/${volumeId}`)}
                  onAddVolume={() => navigate(`/write/advanced?sagaId=${sagaId}`)}
                />
              </div>
            )}
            {!focusMode && (bookId || setupStep === 3) && (
              <div className="md:hidden mb-5 rounded-2xl border border-border bg-card/60 p-3 space-y-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Configuración del proyecto</p>
                <Input
                  placeholder="Sinopsis breve del proyecto…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-10 bg-muted/40 border-0 text-[13px]"
                />
                <button type="button" onClick={() => setIsSaga((value) => !value)} className="w-full flex items-center gap-2 text-left">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="flex-1 text-[13px]">{isSaga ? "Proyecto de saga" : "Convertir en saga"}</span>
                  <span className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-colors ${isSaga ? "bg-primary" : "bg-muted"}`}>
                    <span className={`w-5 h-5 rounded-full bg-background shadow-sm transition-transform ${isSaga ? "translate-x-4" : ""}`} />
                  </span>
                </button>
                {bookId && isAuthor && (
                  <button type="button" onClick={() => setShowCollaborators(true)} className="w-full flex items-center gap-2 rounded-xl bg-primary/10 text-primary px-3 py-2.5 text-[13px] font-semibold">
                    <Users className="w-4 h-4" /> Gestionar colaboradores
                  </button>
                )}
              </div>
            )}
            {/* Chapter Title */}
            <Input
              type="text"
              placeholder="Título del capítulo..."
              value={activeChapter.title}
              onChange={(e) => updateChapterTitle(e.target.value)}
              className="text-[22px] font-display font-bold border-0 bg-transparent px-0 h-auto py-2 mb-2 focus-visible:ring-0"
            />

            {/* Formatting and planning bar */}
            <div className="flex items-center gap-2 mb-4">
              <FormattingToolbar onFormat={applyFormat} compact />
              {!focusMode && (
                <button
                  type="button"
                  onClick={() => setShowNotesPanel(!showNotesPanel)}
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${showNotesPanel ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"}`}
                  aria-label="Abrir notas y planificación"
                  title="Notas y planificación"
                >
                  <StickyNote className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Content Editor */}
            <Textarea
              ref={editorRef}
              placeholder="Empieza a escribir tu capítulo aquí...

La primera línea es siempre la más importante. ¿Qué quieres que sienta el lector?"
              value={activeChapter.content}
              onChange={(e) => updateChapterContent(e.target.value)}
              onKeyDown={handleEditorKeyDown}
              className="min-h-[500px] border-0 bg-transparent px-0 resize-none focus-visible:ring-0 text-[17px] leading-[1.8] placeholder:text-muted-foreground/40"
            />

            {/* Word count */}
            <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-[13px] text-muted-foreground">
              <span>{activeChapter.word_count} palabras</span>
              <span>{activeChapter.content.length} caracteres</span>
            </div>
            {!focusMode && (
              <div className="md:hidden mt-4 rounded-2xl bg-primary/[0.04] border border-primary/10 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-primary" />
                  <label htmlFor="mobile-word-goal" className="text-[12px] font-semibold flex-1">Meta del capítulo</label>
                  <Input id="mobile-word-goal" type="number" min={100} max={100000} step={100} value={wordGoal} onChange={(e) => updateWordGoal(e.target.value)} className="w-20 h-7 text-[11px] px-2" />
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.min(100, (activeChapter.word_count / Math.max(1, wordGoal)) * 100)}%` }} />
                </div>
              </div>
            )}
          </div>
          )}
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
                <div className="mt-4 rounded-2xl bg-primary/[0.04] border border-primary/10 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-primary" />
                    <label htmlFor="chapter-word-goal" className="text-[12px] font-semibold flex-1">Meta de palabras</label>
                    <Input id="chapter-word-goal" type="number" min={100} max={100000} step={100} value={wordGoal} onChange={(e) => updateWordGoal(e.target.value)} className="w-20 h-7 text-[11px] px-2" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                    <span>{activeChapter.word_count.toLocaleString("es-ES")} palabras</span>
                    <span>{Math.min(100, Math.round((activeChapter.word_count / Math.max(1, wordGoal)) * 100))}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.min(100, (activeChapter.word_count / Math.max(1, wordGoal)) * 100)}%` }} />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
                    <CalendarClock className="w-3 h-3" /> Publicar capítulo el
                  </label>
                  <Input
                    type="datetime-local"
                    value={activeChapter.publish_at ? activeChapter.publish_at.slice(0, 16) : ""}
                    onChange={(e) => updateChapterPublishAt(e.target.value ? new Date(e.target.value).toISOString() : "")}
                    className="bg-muted/30 text-[13px] rounded-xl"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Si lo dejas vacío, se publica al instante.
                  </p>
                </div>
                <div className="mt-4">
                  <Textarea
                    placeholder="Descripción del libro..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-muted/30 resize-none text-[14px] min-h-[80px]"
                  />
                  <label className="text-[11px] text-muted-foreground mt-1 block">Sinopsis del libro</label>
                </div>
                {/* Saga toggle */}
                <div className="mt-4">
                  <button
                    onClick={() => setIsSaga(!isSaga)}
                    className="flex items-center gap-2 w-full py-2"
                  >
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span className="text-[13px] flex-1 text-left">Saga</span>
                    <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${isSaga ? "bg-primary" : "bg-muted"}`}>
                      <div className={`w-5 h-5 rounded-full bg-background shadow-sm transition-transform ${isSaga ? "translate-x-4" : "translate-x-0"}`} />
                    </div>
                  </button>
                </div>
                {/* Tags */}
                <div className="mt-4">
                  <label className="text-[11px] text-muted-foreground mb-1 block">Etiquetas ({tags.length}/5)</label>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {tags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-[11px] rounded-full">
                        #{tag}
                        <button onClick={() => setTags(prev => prev.filter(t => t !== tag))} className="hover:text-destructive">×</button>
                      </span>
                    ))}
                  </div>
                  {tags.length < 5 && (
                    <Input
                      type="text"
                      placeholder="Añadir etiqueta..."
                      className="h-8 text-[13px]"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const val = (e.target as HTMLInputElement).value.trim().toLowerCase().replace(/[^a-záéíóúñü0-9]/gi, "");
                          if (val && !tags.includes(val)) {
                            setTags(prev => [...prev, val]);
                            (e.target as HTMLInputElement).value = "";
                          }
                        }
                      }}
                    />
                  )}
                </div>
                {/* Book Config */}
                <div className="mt-4">
                  <BookConfigSection
                    ageRating={ageRating}
                    setAgeRating={setAgeRating}
                    aiGenerated={aiGenerated}
                    setAiGenerated={setAiGenerated}
                    requestVerification={requestVerification}
                    setRequestVerification={setRequestVerification}
                  />
                </div>
                {bookId && isAuthor && (
                  <button type="button" onClick={() => setShowCollaborators(true)} className="w-full mt-4 flex items-center gap-2 rounded-xl bg-primary/10 text-primary px-3 py-2.5 text-[13px] font-semibold hover:bg-primary/15 active:scale-[0.98] transition-transform">
                    <Users className="w-4 h-4" /> Gestionar colaboradores
                  </button>
                )}
                <SagaWorkspace
                  sagaId={sagaId}
                  currentBookId={bookId}
                  onOpenVolume={(volumeId) => navigate(`/write/advanced/${volumeId}`)}
                  onAddVolume={() => navigate(`/write/advanced?sagaId=${sagaId}`)}
                />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {bookId && isAuthor && (
        <BookCollaboratorsModal
          isOpen={showCollaborators}
          onClose={() => setShowCollaborators(false)}
          bookId={bookId}
          bookTitle={title || "Libro sin título"}
        />
      )}

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
                <h3 className="text-[17px] font-semibold text-center mb-4">Gestionar capítulos</h3>
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
                        <p className="text-[12px] text-muted-foreground">{chapter.word_count} palabras · {chapter.is_published ? "Publicado" : chapter.publish_at ? "Programado" : "Borrador"}</p>
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
                          onClick={() => moveChapter(chapter.id, "down")}
                          disabled={index === chapters.length - 1}
                          className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => duplicateChapter(chapter.id)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                          title="Duplicar capítulo"
                        >
                          <Plus className="w-4 h-4" />
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
