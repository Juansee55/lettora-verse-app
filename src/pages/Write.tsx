import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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

const WritePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Romance");
  const [showCategories, setShowCategories] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) navigate("/auth");
    };
    checkAuth();
  }, [navigate]);

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setCoverPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
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
      cover_url: coverPreview, author_id: user.id, status,
    }).select().single();

    if (error) {
      toast({ title: "Error", description: "No se pudo guardar.", variant: "destructive" });
      setSaving(false); setPublishing(false);
      return;
    }

    if (content && book) {
      await supabase.from("chapters").insert({
        book_id: book.id, title: "Capítulo 1", content,
        chapter_number: 1, word_count: content.split(/\s+/).filter(Boolean).length,
        is_published: isPublishing,
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
            className={`relative aspect-[16/9] rounded-2xl overflow-hidden cursor-pointer border-2 border-dashed transition-colors ${
              coverPreview ? "border-transparent" : "border-border hover:border-primary"
            }`}
          >
            {coverPreview ? (
              <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-muted/30">
                <Image className="w-10 h-10 mb-2" />
                <p className="font-medium text-[15px]">Añadir portada</p>
                <p className="text-[13px] text-muted-foreground">Toca para subir</p>
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
            placeholder="Descripción breve..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border-0 bg-transparent px-0 resize-none focus-visible:ring-0 placeholder:text-muted-foreground/40 min-h-[50px] text-[15px]"
          />
        </motion.div>

        {/* Category and settings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-2 mb-6 relative"
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

        {/* Minimal formatting bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="flex items-center gap-0.5 py-2 mb-4 border-b border-border"
        >
          <button className="p-2 rounded-lg hover:bg-muted"><Bold className="w-4 h-4 text-muted-foreground" /></button>
          <button className="p-2 rounded-lg hover:bg-muted"><Italic className="w-4 h-4 text-muted-foreground" /></button>
          <button className="p-2 rounded-lg hover:bg-muted"><List className="w-4 h-4 text-muted-foreground" /></button>
          <button className="p-2 rounded-lg hover:bg-muted"><Image className="w-4 h-4 text-muted-foreground" /></button>
        </motion.div>

        {/* Content editor */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
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
