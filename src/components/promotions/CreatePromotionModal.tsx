import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Clock, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Book {
  id: string;
  title: string;
  cover_url: string | null;
}

interface CreatePromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const durationOptions = [
  { label: "24 horas", hours: 24, icon: "⚡" },
  { label: "3 días", hours: 72, icon: "🔥" },
  { label: "7 días", hours: 168, icon: "🚀" },
];

const CreatePromotionModal = ({ isOpen, onClose, onCreated }: CreatePromotionModalProps) => {
  const { toast } = useToast();
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(24);
  const [loading, setLoading] = useState(false);
  const [fetchingBooks, setFetchingBooks] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchUserBooks();
    }
  }, [isOpen]);

  const fetchUserBooks = async () => {
    setFetchingBooks(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("books")
      .select("id, title, cover_url")
      .eq("author_id", user.id)
      .in("status", ["published", "completed"]);

    if (data) setBooks(data);
    setFetchingBooks(false);
  };

  const handleCreate = async () => {
    if (!selectedBook || !title.trim()) {
      toast({
        title: "Campos requeridos",
        description: "Selecciona un libro y añade un título",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const endsAt = new Date();
    endsAt.setHours(endsAt.getHours() + duration);

    const { error } = await supabase.from("book_promotions").insert({
      book_id: selectedBook.id,
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      duration_hours: duration,
      ends_at: endsAt.toISOString(),
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la promoción",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "¡Promoción creada!",
      description: `Tu promoción estará activa por ${duration} horas`,
    });

    setSelectedBook(null);
    setTitle("");
    setDescription("");
    setDuration(24);
    onCreated();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg">Crear Promoción</h2>
                <p className="text-xs text-muted-foreground">Destaca tu libro</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-5 overflow-y-auto max-h-[60vh]">
            {/* Select Book */}
            <div>
              <label className="text-sm font-medium mb-2 block">Selecciona un libro</label>
              {fetchingBooks ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : books.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No tienes libros publicados</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {books.map((book) => (
                    <motion.div
                      key={book.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedBook(book)}
                      className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                        selectedBook?.id === book.id
                          ? "border-primary shadow-glow"
                          : "border-transparent"
                      }`}
                    >
                      <div className="aspect-[3/4]">
                        <img
                          src={book.cover_url || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&h=300&fit=crop"}
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {selectedBook?.id === book.id && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute inset-0 bg-primary/20 flex items-center justify-center"
                        >
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <span className="text-primary-foreground text-xs">✓</span>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="text-sm font-medium mb-2 block">Título de la promoción</label>
              <Input
                placeholder="Ej: ¡50% de descuento!"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium mb-2 block">Descripción (opcional)</label>
              <Textarea
                placeholder="Cuéntales por qué deberían leer tu libro..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-xl resize-none"
                rows={3}
              />
            </div>

            {/* Duration */}
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Duración
              </label>
              <div className="grid grid-cols-3 gap-2">
                {durationOptions.map((option) => (
                  <motion.button
                    key={option.hours}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setDuration(option.hours)}
                    className={`p-3 rounded-xl text-center transition-all ${
                      duration === option.hours
                        ? "bg-primary text-primary-foreground shadow-glow"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    <span className="text-lg mb-1 block">{option.icon}</span>
                    <span className="text-sm font-medium">{option.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <Button
              variant="hero"
              size="lg"
              className="w-full"
              onClick={handleCreate}
              disabled={loading || !selectedBook || !title.trim()}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Crear Promoción
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreatePromotionModal;
