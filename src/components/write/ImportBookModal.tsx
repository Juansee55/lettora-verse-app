import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, FileText, Loader2, X, Upload, Link, Image,
  Hash, Plus, ChevronDown, Check, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import BookConfigSection from "@/components/write/BookConfigSection";

const categories = [
  "Romance", "Fantasía", "Misterio", "Poesía",
  "Drama", "Aventura", "Ciencia Ficción", "Terror",
  "No Ficción", "Biografía", "Autoayuda", "Historia",
  "Ficción Literaria", "Ficción Contemporánea", "Ficción Histórica",
  "Distopía", "Thriller", "Humor", "Infantil", "Juvenil",
  "Erótica", "Paranormal", "Cyberpunk", "Steampunk",
];

interface ImportBookModalProps {
  open: boolean;
  onClose: () => void;
}

type ImportMode = "url" | "pdf";

const ImportBookModal = ({ open, onClose }: ImportBookModalProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<ImportMode>("url");

  // Shared state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [category, setCategory] = useState("Romance");
  const [showCategories, setShowCategories] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [ageRating, setAgeRating] = useState("all");
  const [aiGenerated, setAiGenerated] = useState(false);
  const [requestVerification, setRequestVerification] = useState(false);
  // URL mode
  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);

  // PDF mode
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setTitle(""); setDescription(""); setCoverPreview(null); setCoverFile(null);
    setCategory("Romance"); setTags([]); setTagInput(""); setUrl("");
    setPdfFile(null); setFetching(false); setPublishing(false);
    setAgeRating("all"); setAiGenerated(false); setRequestVerification(false);
  };

  const handleClose = () => { resetState(); onClose(); };

  // --- URL Import ---
  const fetchUrlMetadata = async () => {
    if (!url.trim()) return;
    setFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-url-metadata", {
        body: { url: url.trim() },
      });
      if (error) throw error;
      if (data?.success && data.data) {
        setTitle(data.data.title || "");
        setDescription(data.data.description || "");
        if (data.data.image) setCoverPreview(data.data.image);
        toast({ title: "Datos extraídos", description: "Revisa y ajusta la información." });
      } else {
        toast({ title: "No se pudo extraer", description: data?.error || "Intenta manualmente.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "No se pudo acceder a la URL.", variant: "destructive" });
    } finally {
      setFetching(false);
    }
  };

  // --- PDF Import ---
  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast({ title: "Formato inválido", description: "Solo archivos PDF.", variant: "destructive" });
      return;
    }
    setPdfFile(file);
    // Use filename as title
    const name = file.name.replace(/\.pdf$/i, "").replace(/[_-]/g, " ");
    setTitle(name.charAt(0).toUpperCase() + name.slice(1));
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setCoverPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // --- Tags ---
  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/[^a-záéíóúñü0-9]/gi, "");
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags(prev => [...prev, tag]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  // --- Publish ---
  const handlePublish = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    if (!title.trim()) {
      toast({ title: "Título requerido", variant: "destructive" });
      return;
    }
    setPublishing(true);

    try {
      // Create the book
      const { data: book, error } = await supabase.from("books").insert({
        title: title.trim(),
        description: description.trim() || null,
        genre: category,
        cover_url: null,
        author_id: user.id,
        status: "published",
        tags: tags.length > 0 ? tags : null,
        age_rating: ageRating,
        ai_generated: aiGenerated,
        verification_status: requestVerification ? "pending" : "not_requested",
      } as any).select().single();

      if (error || !book) throw error || new Error("No book created");

      // Upload cover
      let finalCoverUrl = coverPreview;
      if (coverFile) {
        const ext = coverFile.name.split(".").pop();
        const path = `book-covers/${book.id}.${ext}`;
        const { error: upErr } = await supabase.storage.from("posts").upload(path, coverFile, { upsert: true });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("posts").getPublicUrl(path);
          finalCoverUrl = urlData.publicUrl;
        }
      } else if (coverPreview && coverPreview.startsWith("http")) {
        // Use the URL directly as cover
        finalCoverUrl = coverPreview;
      }

      if (finalCoverUrl) {
        await supabase.from("books").update({ cover_url: finalCoverUrl }).eq("id", book.id);
      }

      // Upload PDF as chapter content
      if (pdfFile) {
        const pdfPath = `book-pdfs/${book.id}.pdf`;
        await supabase.storage.from("posts").upload(pdfPath, pdfFile, { upsert: true });
        const { data: pdfUrlData } = supabase.storage.from("posts").getPublicUrl(pdfPath);

        await supabase.from("chapters").insert({
          book_id: book.id,
          title: "Libro completo",
          content: `[PDF: ${pdfUrlData.publicUrl}]`,
          chapter_number: 1,
          word_count: 0,
          is_published: true,
        });
      }

      // URL source as chapter
      if (mode === "url" && url.trim()) {
        await supabase.from("chapters").insert({
          book_id: book.id,
          title: "Fuente original",
          content: `Importado desde: ${url.trim()}`,
          chapter_number: 1,
          word_count: 0,
          is_published: true,
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

      toast({ title: "¡Libro publicado!", description: "Ya está disponible para los lectores." });
      handleClose();
      navigate("/profile");
    } catch (err) {
      console.error(err);
      toast({ title: "Error al publicar", description: "Inténtalo de nuevo.", variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
        onClick={handleClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-lg bg-card rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-card z-10 px-5 pt-4 pb-3 border-b border-border">
            <div className="ios-pull-indicator mb-3" />
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-bold">Importar libro</h2>
              <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode tabs */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setMode("url")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[14px] font-medium transition-colors ${
                  mode === "url" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}
              >
                <Globe className="w-4 h-4" />
                Desde URL
              </button>
              <button
                onClick={() => setMode("pdf")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[14px] font-medium transition-colors ${
                  mode === "pdf" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}
              >
                <FileText className="w-4 h-4" />
                Subir PDF
              </button>
            </div>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* URL Input */}
            {mode === "url" && (
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://ejemplo.com/libro..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1 h-11 rounded-xl"
                />
                <Button
                  onClick={fetchUrlMetadata}
                  disabled={fetching || !url.trim()}
                  variant="ios"
                  size="ios-sm"
                  className="h-11 px-4"
                >
                  {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                </Button>
              </div>
            )}

            {/* PDF Input */}
            {mode === "pdf" && (
              <div>
                <input
                  type="file"
                  ref={pdfInputRef}
                  onChange={handlePdfSelect}
                  accept=".pdf,application/pdf"
                  className="hidden"
                />
                <button
                  onClick={() => pdfInputRef.current?.click()}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed transition-colors ${
                    pdfFile ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/40"
                  }`}
                >
                  {pdfFile ? (
                    <>
                      <FileText className="w-8 h-8 text-primary flex-shrink-0" />
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-[14px] font-medium truncate">{pdfFile.name}</p>
                        <p className="text-[12px] text-muted-foreground">
                          {(pdfFile.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                      <Check className="w-5 h-5 text-primary" />
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <div className="text-left">
                        <p className="text-[14px] font-medium">Seleccionar PDF</p>
                        <p className="text-[12px] text-muted-foreground">Máximo 10 MB</p>
                      </div>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Cover */}
            <div>
              <p className="text-[13px] font-medium text-muted-foreground mb-2">Portada</p>
              <input type="file" ref={coverInputRef} onChange={handleCoverUpload} accept="image/*" className="hidden" />
              <div className="flex items-center gap-3">
                <div
                  onClick={() => coverInputRef.current?.click()}
                  className={`w-20 h-28 rounded-xl overflow-hidden cursor-pointer border-2 border-dashed flex-shrink-0 transition-colors ${
                    coverPreview ? "border-transparent" : "border-border hover:border-primary/40"
                  }`}
                >
                  {coverPreview ? (
                    <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/30">
                      <Image className="w-5 h-5 mb-1" />
                      <span className="text-[10px]">Portada</span>
                    </div>
                  )}
                </div>
                <p className="text-[12px] text-muted-foreground">
                  {coverPreview ? "Toca para cambiar" : "Sube una imagen o se extraerá automáticamente"}
                </p>
              </div>
            </div>

            {/* Title */}
            <div>
              <p className="text-[13px] font-medium text-muted-foreground mb-1.5">Título</p>
              <Input
                placeholder="Título del libro..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11 rounded-xl text-[15px] font-semibold"
              />
            </div>

            {/* Description */}
            <div>
              <p className="text-[13px] font-medium text-muted-foreground mb-1.5">Descripción</p>
              <Textarea
                placeholder="Sinopsis o descripción del libro..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[80px] rounded-xl text-[14px] resize-none"
              />
            </div>

            {/* Category */}
            <div className="relative">
              <p className="text-[13px] font-medium text-muted-foreground mb-1.5">Categoría</p>
              <button
                onClick={() => setShowCategories(!showCategories)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-secondary text-[14px] font-medium"
              >
                {category}
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
              {showCategories && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-card rounded-xl shadow-lg border border-border p-1.5 z-50 max-h-[200px] overflow-y-auto">
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

            {/* Tags */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <span className="text-[13px] font-medium text-muted-foreground">Etiquetas ({tags.length}/10)</span>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-[12px] rounded-full font-medium"
                    >
                      #{tag}
                      <button onClick={() => removeTag(tag)}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {tags.length < 10 && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Añadir etiqueta..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    className="h-9 text-[13px] rounded-xl"
                  />
                  <Button variant="ios-ghost" size="sm" onClick={addTag} disabled={!tagInput.trim()}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Book Configuration */}
            <BookConfigSection
              ageRating={ageRating}
              setAgeRating={setAgeRating}
              aiGenerated={aiGenerated}
              setAiGenerated={setAiGenerated}
              requestVerification={requestVerification}
              setRequestVerification={setRequestVerification}
            />

            <Button
              onClick={handlePublish}
              disabled={publishing || !title.trim() || (mode === "pdf" && !pdfFile) || (mode === "url" && !url.trim())}
              className="w-full h-12 rounded-xl text-[15px] font-semibold"
              variant="ios"
            >
              {publishing ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Upload className="w-5 h-5 mr-2" />
              )}
              Publicar libro
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ImportBookModal;
