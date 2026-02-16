import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Image,
  Bold,
  Italic,
  List,
  Save,
  Send,
  ChevronDown,
  Users,
  Plus,
  Sparkles,
  Loader2,
  BookOpen,
  Library,
  Hash,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const categories = [
  "Romance", "Fantasía", "Misterio", "Poesía",
  "Drama", "Aventura", "Ciencia Ficción", "Terror",
];

interface UserSaga {
  id: string;
  title: string;
}

const WritePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Romance");
  const [showCategories, setShowCategories] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Saga state
  const [isSaga, setIsSaga] = useState(false);
  const [parentSagaId, setParentSagaId] = useState<string | null>(null);
  const [showSagaPicker, setShowSagaPicker] = useState(false);
  const [userSagas, setUserSagas] = useState<UserSaga[]>([]);
  const [selectedSagaTitle, setSelectedSagaTitle] = useState<string | null>(null);

  // Tags state
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) navigate("/auth");
    };
    checkAuth();
  }, [navigate]);

  const loadUserSagas = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("books")
      .select("id, title")
      .eq("author_id", user.id)
      .eq("is_saga", true)
      .is("parent_saga_id", null)
      .order("created_at", { ascending: false });
    if (data) setUserSagas(data);
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setCoverPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/[^a-záéíóúñü0-9]/gi, "");
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags(prev => [...prev, tag]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  const uploadCover = async (bookId: string): Promise<string | null> => {
    if (!coverFile) return coverPreview;
    const ext = coverFile.name.split(".").pop();
    const path = `book-covers/${bookId}.${ext}`;
    const { error } = await supabase.storage.from("posts").upload(path, coverFile, { upsert: true });
    if (error) return coverPreview;
    const { data: urlData } = supabase.storage.from("posts").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const saveBook = async (status: "draft" | "published") => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    if (!title) {
      toast({ title: "Título requerido", description: "Añade un título a tu historia.", variant: "destructive" });
      return;
    }

    const isPublishing = status === "published";
    if (isPublishing) setPublishing(true); else setSaving(true);

    const { data: book, error } = await supabase.from("books").insert({
      title, description, genre: category,
      cover_url: null, author_id: user.id, status,
      is_saga: isSaga,
      parent_saga_id: parentSagaId,
      tags: tags.length > 0 ? tags : null,
    }).select().single();

    if (error || !book) {
      toast({ title: "Error", description: "No se pudo guardar.", variant: "destructive" });
      setSaving(false); setPublishing(false);
      return;
    }

    // Upload cover
    const coverUrl = await uploadCover(book.id);
    if (coverUrl) {
      await supabase.from("books").update({ cover_url: coverUrl }).eq("id", book.id);
    }

    // Set saga_order if part of a saga
    if (parentSagaId) {
      const { data: siblings } = await supabase
        .from("books")
        .select("id")
        .eq("parent_saga_id", parentSagaId)
        .order("saga_order", { ascending: true });
      if (siblings) {
        await supabase.from("books").update({ saga_order: siblings.length }).eq("id", book.id);
      }
    }

    if (content && book) {
      await supabase.from("chapters").insert({
        book_id: book.id, title: "Capítulo 1", content,
        chapter_number: 1, word_count: content.split(/\s+/).filter(Boolean).length,
        is_published: isPublishing,
      });
    }

    // Upsert hashtags
    if (tags.length > 0) {
      await supabase.rpc("upsert_hashtags", {
        p_tags: tags,
        p_content_id: book.id,
        p_content_type: "book",
        p_user_id: user.id,
      });
    }

    setSaving(false); setPublishing(false);
    toast({
      title: isPublishing ? "¡Historia publicada!" : "Borrador guardado",
      description: isPublishing ? "Ya está disponible para los lectores." : "Guardada como borrador.",
    });
    navigate("/profile");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* iOS Header */}
      <div className="ios-header">
        <div className="flex items-center justify-between px-4 h-[52px]">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-primary active:opacity-60">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-[17px]">Atrás</span>
          </button>
          <h1 className="font-semibold text-[17px]">Nueva historia</h1>
          <div className="flex items-center gap-2">
            <Button variant="ios-ghost" size="ios-sm" onClick={() => saveBook("draft")} disabled={saving || publishing}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            </Button>
            <Button variant="ios" size="ios-sm" onClick={() => saveBook("published")} disabled={saving || publishing}>
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-1" />Publicar</>}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-5 py-6">
        {/* Cover upload */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <input type="file" ref={fileInputRef} onChange={handleCoverUpload} accept="image/*" className="hidden" />
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`relative aspect-[2/3] max-w-[200px] mx-auto rounded-2xl overflow-hidden cursor-pointer border-2 border-dashed transition-colors ${
              coverPreview ? "border-transparent shadow-lg" : "border-border hover:border-primary"
            }`}
          >
            {coverPreview ? (
              <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-muted/30">
                <Image className="w-10 h-10 mb-2" />
                <p className="font-medium text-[15px]">Portada</p>
                <p className="text-[13px] text-muted-foreground">Formato libro</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-3">
          <Input
            type="text"
            placeholder="Título de tu historia..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-[22px] font-display font-bold border-0 bg-transparent px-0 h-auto py-2 focus-visible:ring-0 placeholder:text-muted-foreground/40"
          />
        </motion.div>

        {/* Description */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mb-4">
          <Textarea
            placeholder="Sinopsis de tu historia..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border-0 bg-transparent px-0 resize-none focus-visible:ring-0 placeholder:text-muted-foreground/40 min-h-[60px] text-[15px]"
          />
        </motion.div>

        {/* Category and settings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-2 mb-4 relative"
        >
          <div className="relative">
            <button
              onClick={() => setShowCategories(!showCategories)}
              className="flex items-center gap-1 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-[13px] font-medium"
            >
              {category}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showCategories && (
              <div className="absolute top-full mt-2 left-0 bg-card rounded-xl shadow-lg border border-border p-1.5 z-50 min-w-[150px]">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { setCategory(cat); setShowCategories(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-[13px] transition-colors ${
                      category === cat ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="flex items-center gap-1 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-[13px] font-medium">
            <Users className="w-3.5 h-3.5" />
            Colaborar
          </button>
          <button
            onClick={() => navigate("/write/advanced")}
            className="flex items-center gap-1 px-4 py-2 rounded-full bg-primary/10 text-primary text-[13px] font-medium ml-auto"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Avanzado
          </button>
        </motion.div>

        {/* Saga Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="mb-4 ios-section"
        >
          {/* Is Saga toggle */}
          <button
            onClick={() => {
              setIsSaga(!isSaga);
              if (isSaga) { setParentSagaId(null); setSelectedSagaTitle(null); }
            }}
            className="ios-item w-full"
          >
            <Library className="w-5 h-5 text-primary" />
            <span className="flex-1 text-[15px] text-left">Crear como saga</span>
            <div className={`w-12 h-7 rounded-full transition-colors flex items-center px-0.5 ${isSaga ? "bg-primary" : "bg-muted"}`}>
              <div className={`w-6 h-6 rounded-full bg-background shadow-sm transition-transform ${isSaga ? "translate-x-5" : "translate-x-0"}`} />
            </div>
          </button>

          {/* Add to existing saga */}
          {!isSaga && (
            <button
              onClick={() => { loadUserSagas(); setShowSagaPicker(true); }}
              className="ios-item w-full"
            >
              <BookOpen className="w-5 h-5 text-primary" />
              <span className="flex-1 text-[15px] text-left">
                {selectedSagaTitle ? `Parte de: ${selectedSagaTitle}` : "Añadir a saga existente"}
              </span>
              {parentSagaId ? (
                <button onClick={(e) => { e.stopPropagation(); setParentSagaId(null); setSelectedSagaTitle(null); }}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          )}
        </motion.div>

        {/* Saga Picker Sheet */}
        <AnimatePresence>
          {showSagaPicker && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40"
              onClick={() => setShowSagaPicker(false)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl max-h-[60vh] overflow-y-auto"
              >
                <div className="p-4">
                  <div className="ios-pull-indicator" />
                  <h3 className="text-[17px] font-semibold text-center mb-4">Seleccionar saga</h3>
                  {userSagas.length === 0 ? (
                    <div className="text-center py-8">
                      <Library className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-[15px] text-muted-foreground">No tienes sagas creadas</p>
                      <p className="text-[13px] text-muted-foreground/70">Crea una activando "Crear como saga"</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {userSagas.map((saga) => (
                        <button
                          key={saga.id}
                          onClick={() => {
                            setParentSagaId(saga.id);
                            setSelectedSagaTitle(saga.title);
                            setShowSagaPicker(false);
                          }}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                            parentSagaId === saga.id ? "bg-primary/10" : "active:bg-muted"
                          }`}
                        >
                          <Library className="w-5 h-5 text-primary flex-shrink-0" />
                          <span className="text-[15px] font-medium text-left flex-1 truncate">{saga.title}</span>
                          {parentSagaId === saga.id && <Check className="w-5 h-5 text-primary" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tags */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <Hash className="w-4 h-4 text-muted-foreground" />
            <span className="text-[13px] font-medium text-muted-foreground">Etiquetas ({tags.length}/5)</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary text-[13px] rounded-full font-medium"
              >
                #{tag}
                <button onClick={() => removeTag(tag)} className="hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          {tags.length < 5 && (
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Añadir etiqueta..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                className="h-9 text-[14px] rounded-xl"
              />
              <Button variant="ios-ghost" size="sm" onClick={addTag} disabled={!tagInput.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}
        </motion.div>

        {/* Minimal formatting bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="flex items-center gap-0.5 py-2 mb-4 border-b border-border"
        >
          <button className="p-2 rounded-lg hover:bg-muted"><Bold className="w-4 h-4 text-muted-foreground" /></button>
          <button className="p-2 rounded-lg hover:bg-muted"><Italic className="w-4 h-4 text-muted-foreground" /></button>
          <button className="p-2 rounded-lg hover:bg-muted"><List className="w-4 h-4 text-muted-foreground" /></button>
          <button className="p-2 rounded-lg hover:bg-muted"><Image className="w-4 h-4 text-muted-foreground" /></button>
        </motion.div>

        {/* Content editor */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <Textarea
            placeholder="Empieza a escribir tu historia aquí...

La primera línea es siempre la más importante."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[400px] border-0 bg-transparent px-0 resize-none focus-visible:ring-0 text-[17px] leading-[1.8] placeholder:text-muted-foreground/40"
          />
        </motion.div>

        {/* Word count */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-4 text-[13px] text-muted-foreground">
          {content.split(/\s+/).filter(Boolean).length} palabras • {content.length} caracteres
        </motion.div>
      </main>
    </div>
  );
};

export default WritePage;
