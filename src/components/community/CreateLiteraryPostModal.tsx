import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, BookOpen, Quote, PenLine, Star, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const postTypes = [
  { key: "quote", label: "Cita", icon: Quote, placeholder: "Comparte una frase que te marcó..." },
  { key: "reflection", label: "Reflexión", icon: PenLine, placeholder: "¿Qué te hizo pensar este libro?" },
  { key: "recommendation", label: "Recomendar", icon: Star, placeholder: "¿Por qué recomiendas este libro?" },
  { key: "own_text", label: "Texto propio", icon: BookOpen, placeholder: "Comparte un poema, historia corta..." },
];

interface BookResult {
  id: string;
  title: string;
  cover_url: string | null;
}

const CreateLiteraryPostModal = ({ isOpen, onClose, onCreated }: Props) => {
  const { toast } = useToast();
  const [postType, setPostType] = useState("reflection");
  const [content, setContent] = useState("");
  const [quoteText, setQuoteText] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [bookSearch, setBookSearch] = useState("");
  const [bookResults, setBookResults] = useState<BookResult[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookResult | null>(null);
  const [searchingBooks, setSearchingBooks] = useState(false);

  useEffect(() => {
    if (!bookSearch.trim()) { setBookResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchingBooks(true);
      const { data } = await supabase
        .from("books")
        .select("id, title, cover_url")
        .ilike("title", `%${bookSearch}%`)
        .limit(5);
      setBookResults(data || []);
      setSearchingBooks(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [bookSearch]);

  const handlePublish = async () => {
    if (!content.trim()) return;
    setPublishing(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast({ title: "Inicia sesión", variant: "destructive" }); setPublishing(false); return; }

    const { error } = await supabase.from("literary_posts").insert({
      user_id: user.id,
      post_type: postType,
      content: content.trim(),
      quote_text: postType === "quote" ? quoteText.trim() || null : null,
      linked_book_id: selectedBook?.id || null,
    });

    if (error) {
      toast({ title: "Error al publicar", variant: "destructive" });
    } else {
      toast({ title: "Publicado en la comunidad ✨" });
      setContent(""); setQuoteText(""); setSelectedBook(null); setBookSearch("");
      onCreated();
    }
    setPublishing(false);
  };

  const activeType = postTypes.find(t => t.key === postType)!;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 liquid-glass border-b border-white/10">
            <div className="flex items-center justify-between px-4 h-[52px]">
              <button onClick={onClose} className="text-primary text-[16px] font-medium">
                Cancelar
              </button>
              <h2 className="font-bold text-[17px]">Nueva publicación</h2>
              <Button
                size="sm"
                onClick={handlePublish}
                disabled={publishing || !content.trim()}
                className="rounded-full h-9 px-5 bg-primary text-primary-foreground font-semibold text-[14px] disabled:opacity-30"
              >
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publicar"}
              </Button>
            </div>
          </div>

          <div className="px-4 py-4 max-w-2xl mx-auto space-y-4 overflow-y-auto max-h-[calc(100vh-52px)]">
            {/* Type selector */}
            <div className="grid grid-cols-4 gap-2">
              {postTypes.map(type => (
                <button
                  key={type.key}
                  onClick={() => setPostType(type.key)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-2xl text-[11px] font-semibold transition-all ${
                    postType === type.key
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "bg-muted/40 text-muted-foreground"
                  }`}
                >
                  <type.icon className="w-5 h-5" />
                  {type.label}
                </button>
              ))}
            </div>

            {/* Quote field */}
            {postType === "quote" && (
              <div className="bg-primary/5 rounded-xl p-3 border-l-3 border-primary/30">
                <Textarea
                  placeholder="Escribe la cita textual..."
                  value={quoteText}
                  onChange={e => setQuoteText(e.target.value)}
                  className="min-h-[80px] text-[15px] border-0 bg-transparent resize-none focus-visible:ring-0 placeholder:text-muted-foreground/40 italic"
                />
              </div>
            )}

            {/* Content */}
            <Textarea
              placeholder={activeType.placeholder}
              value={content}
              onChange={e => setContent(e.target.value)}
              className="min-h-[140px] text-[16px] border-0 bg-transparent rounded-xl resize-none focus-visible:ring-0 placeholder:text-muted-foreground/40"
              autoFocus
            />

            {/* Link book */}
            <div className="space-y-2">
              <p className="text-[13px] font-semibold text-muted-foreground">Vincular libro (opcional)</p>
              {selectedBook ? (
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                  {selectedBook.cover_url ? (
                    <img src={selectedBook.cover_url} alt="" className="w-8 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-8 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-primary/40" />
                    </div>
                  )}
                  <p className="text-[14px] font-medium flex-1 truncate">{selectedBook.title}</p>
                  <button onClick={() => setSelectedBook(null)} className="p-1.5 rounded-full hover:bg-muted/50">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                  <Input
                    placeholder="Buscar libro..."
                    value={bookSearch}
                    onChange={e => setBookSearch(e.target.value)}
                    className="pl-9 rounded-xl bg-muted/30 border-0 h-10 text-[14px]"
                  />
                  {bookResults.length > 0 && (
                    <div className="absolute top-full mt-1 left-0 right-0 bg-card border border-border/30 rounded-xl shadow-lg z-10 overflow-hidden">
                      {bookResults.map(book => (
                        <button
                          key={book.id}
                          onClick={() => { setSelectedBook(book); setBookSearch(""); setBookResults([]); }}
                          className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-muted/30 transition-colors text-left"
                        >
                          {book.cover_url ? (
                            <img src={book.cover_url} alt="" className="w-7 h-10 rounded object-cover" />
                          ) : (
                            <div className="w-7 h-10 rounded bg-primary/10 flex items-center justify-center">
                              <BookOpen className="w-3.5 h-3.5 text-primary/40" />
                            </div>
                          )}
                          <span className="text-[13px] font-medium truncate">{book.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CreateLiteraryPostModal;
