import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Image,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  List,
  Save,
  Send,
  ChevronDown,
  Users,
  Plus,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const WritePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Romance");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSave = () => {
    toast({
      title: "Borrador guardado",
      description: "Tu historia ha sido guardada como borrador.",
    });
  };

  const handlePublish = () => {
    if (!title || !content) {
      toast({
        title: "Campos incompletos",
        description: "Por favor añade un título y contenido.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "¡Historia publicada!",
      description: "Tu historia ya está disponible para los lectores.",
    });
    navigate("/profile");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border"
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="font-display font-semibold">Nueva historia</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Guardar
              </Button>
              <Button variant="hero" size="sm" onClick={handlePublish}>
                <Send className="w-4 h-4 mr-2" />
                Publicar
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Cover upload */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleCoverUpload}
            accept="image/*"
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`relative aspect-[16/9] md:aspect-[21/9] rounded-2xl overflow-hidden cursor-pointer border-2 border-dashed transition-colors ${
              coverPreview
                ? "border-transparent"
                : "border-border hover:border-primary"
            }`}
          >
            {coverPreview ? (
              <img
                src={coverPreview}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                <Image className="w-12 h-12 mb-2" />
                <p className="font-medium">Añadir portada</p>
                <p className="text-sm">Haz clic para subir una imagen</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4"
        >
          <Input
            type="text"
            placeholder="Título de tu historia..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-2xl font-display font-bold border-0 bg-transparent px-0 h-auto py-2 focus-visible:ring-0 placeholder:text-muted-foreground/50"
          />
        </motion.div>

        {/* Category and settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-wrap gap-2 mb-6"
        >
          <Button variant="secondary" size="sm" className="rounded-full">
            {category}
            <ChevronDown className="w-4 h-4 ml-1" />
          </Button>
          <Button variant="outline" size="sm" className="rounded-full">
            <Users className="w-4 h-4 mr-1" />
            Invitar colaborador
          </Button>
          <Button variant="outline" size="sm" className="rounded-full">
            <Plus className="w-4 h-4 mr-1" />
            Añadir a saga
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-full ml-auto"
            onClick={() => navigate("/write/advanced")}
          >
            <Sparkles className="w-4 h-4 mr-1" />
            Modo avanzado
          </Button>
        </motion.div>

        {/* Formatting toolbar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-1 p-2 bg-muted/50 rounded-xl mb-4"
        >
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Bold className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Italic className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <AlignLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <AlignCenter className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <List className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Image className="w-4 h-4" />
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" className="text-primary">
            <Sparkles className="w-4 h-4 mr-1" />
            IA
          </Button>
        </motion.div>

        {/* Content editor */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Textarea
            placeholder="Empieza a escribir tu historia aquí...

La primera línea es siempre la más importante. ¿Qué quieres que sienta el lector cuando lea tu primera frase?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[400px] border-0 bg-transparent px-0 resize-none focus-visible:ring-0 text-lg leading-relaxed placeholder:text-muted-foreground/50"
          />
        </motion.div>

        {/* Word count */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 text-sm text-muted-foreground"
        >
          {content.split(/\s+/).filter(Boolean).length} palabras •{" "}
          {content.length} caracteres
        </motion.div>
      </main>
    </div>
  );
};

export default WritePage;
