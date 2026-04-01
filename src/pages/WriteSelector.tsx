import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, FileText, Library, ArrowLeft, Sparkles, GripVertical, Plus, X, Check, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import IOSBottomNav from "@/components/navigation/IOSBottomNav";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";

interface BookItem {
  id: string;
  title: string;
  cover_url: string | null;
  genre: string | null;
}

const writeOptions = [
  {
    id: "novel",
    icon: BookOpen,
    title: "Escribir Novela",
    description: "Historia con capítulos, personajes y arcos narrativos",
    gradient: "from-violet-500 to-purple-600",
    path: "/write/new?type=novel",
  },
  {
    id: "book",
    icon: FileText,
    title: "Escribir Libro",
    description: "Obra sin capítulos — poesía, ensayo o texto libre",
    gradient: "from-blue-500 to-cyan-500",
    path: "/write/new?type=book",
  },
];

const WriteSelectorPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [showSagaCreator, setShowSagaCreator] = useState(false);
  const [myBooks, setMyBooks] = useState<BookItem[]>([]);
  const [selectedBooks, setSelectedBooks] = useState<BookItem[]>([]);
  const [sagaTitle, setSagaTitle] = useState("");
  const [sagaDescription, setSagaDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [creating, setCreating] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const fetchMyBooks = async () => {
    setLoadingBooks(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("books")
      .select("id, title, cover_url, genre")
      .eq("author_id", user.id)
      .is("parent_saga_id", null)
      .is("is_saga", null)
      .order("created_at", { ascending: false });
    if (data) setMyBooks(data);
    setLoadingBooks(false);
  };

  const toggleBook = (book: BookItem) => {
    if (selectedBooks.find(b => b.id === book.id)) {
      setSelectedBooks(prev => prev.filter(b => b.id !== book.id));
    } else {
      setSelectedBooks(prev => [...prev, book]);
    }
  };

  const moveBook = (from: number, to: number) => {
    const arr = [...selectedBooks];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    setSelectedBooks(arr);
  };

  const handleCreateSaga = async () => {
    if (!sagaTitle.trim() || selectedBooks.length < 2) {
      toast({ title: "Necesitas un título y al menos 2 libros", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Create saga parent
    const { data: saga, error } = await supabase.from("books").insert({
      title: sagaTitle.trim(),
      description: sagaDescription.trim() || null,
      author_id: user.id,
      is_saga: true,
      status: "published",
    }).select().single();

    if (error || !saga) {
      toast({ title: "Error al crear saga", variant: "destructive" });
      setCreating(false);
      return;
    }

    // Assign books to saga with order
    for (let i = 0; i < selectedBooks.length; i++) {
      await supabase.from("books").update({
        parent_saga_id: saga.id,
        saga_order: i + 1,
      }).eq("id", selectedBooks[i].id);
    }

    toast({ title: "¡Saga creada! 📚" });
    setCreating(false);
    navigate(`/book/${saga.id}`);
  };

  const filteredBooks = myBooks.filter(b =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="ios-header">
        <div className="flex items-center justify-between px-4 h-[52px]">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-primary active:opacity-60">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-[17px]">{t("back")}</span>
          </button>
          <h1 className="font-semibold text-[17px]">{t("create")}</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="px-4 pt-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-[22px] font-bold">¿Qué quieres crear?</h2>
          <p className="text-[15px] text-muted-foreground mt-1">Elige el formato que mejor se adapte a tu historia</p>
        </motion.div>

        <div className="space-y-3">
          {writeOptions.map((option, i) => (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => navigate(option.path)}
              className="w-full flex items-center gap-4 p-4 bg-card rounded-2xl active:scale-[0.98] transition-transform text-left"
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${option.gradient} flex items-center justify-center flex-shrink-0`}>
                <option.icon className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[17px] font-semibold">{option.title}</h3>
                <p className="text-[13px] text-muted-foreground mt-0.5">{option.description}</p>
              </div>
            </motion.button>
          ))}

          {/* Saga option */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => { setShowSagaCreator(true); fetchMyBooks(); }}
            className="w-full flex items-center gap-4 p-4 bg-card rounded-2xl active:scale-[0.98] transition-transform text-left"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
              <Library className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[17px] font-semibold">Crear Saga</h3>
              <p className="text-[13px] text-muted-foreground mt-0.5">Selecciona y ordena libros existentes en una serie</p>
            </div>
          </motion.button>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-6">
          <button onClick={() => navigate("/write/advanced")} className="w-full flex items-center justify-center gap-2 py-3 text-primary text-[15px] font-medium active:opacity-60">
            <Sparkles className="w-4 h-4" />
            Editor avanzado
          </button>
        </motion.div>
      </main>

      {/* Saga Creator Sheet */}
      <AnimatePresence>
        {showSagaCreator && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
            onClick={() => setShowSagaCreator(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-card rounded-t-3xl max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-[17px] font-semibold">Crear Saga</h2>
                <button onClick={() => setShowSagaCreator(false)}>
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Saga info */}
                <div className="space-y-3">
                  <Input
                    placeholder="Nombre de la saga"
                    value={sagaTitle}
                    onChange={(e) => setSagaTitle(e.target.value)}
                    className="rounded-xl h-11"
                  />
                  <textarea
                    placeholder="Descripción (opcional)"
                    value={sagaDescription}
                    onChange={(e) => setSagaDescription(e.target.value)}
                    rows={2}
                    className="w-full bg-muted/50 rounded-xl p-3 text-[14px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 border-0"
                  />
                </div>

                {/* Selected books - reorderable */}
                {selectedBooks.length > 0 && (
                  <div>
                    <p className="text-[13px] font-medium text-muted-foreground mb-2">Orden de la saga ({selectedBooks.length} libros)</p>
                    <div className="space-y-1.5">
                      {selectedBooks.map((book, index) => (
                        <div key={book.id} className="flex items-center gap-2 p-2.5 bg-primary/5 rounded-xl border border-primary/10">
                          <div className="flex flex-col gap-0.5">
                            <button
                              disabled={index === 0}
                              onClick={() => moveBook(index, index - 1)}
                              className="text-muted-foreground disabled:opacity-20 hover:text-foreground"
                            >
                              <GripVertical className="w-4 h-4 rotate-180" />
                            </button>
                            <button
                              disabled={index === selectedBooks.length - 1}
                              onClick={() => moveBook(index, index + 1)}
                              className="text-muted-foreground disabled:opacity-20 hover:text-foreground"
                            >
                              <GripVertical className="w-4 h-4" />
                            </button>
                          </div>
                          <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full text-[12px] flex items-center justify-center font-bold flex-shrink-0">
                            {index + 1}
                          </span>
                          {book.cover_url && (
                            <img src={book.cover_url} alt="" className="w-8 h-12 rounded object-cover flex-shrink-0" />
                          )}
                          <span className="text-[14px] font-medium flex-1 truncate">{book.title}</span>
                          <button onClick={() => toggleBook(book)} className="text-destructive/70">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Book selector */}
                <div>
                  <p className="text-[13px] font-medium text-muted-foreground mb-2">Tus libros</p>
                  <div className="relative mb-2">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      placeholder="Buscar libro..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-9 pl-9 pr-3 rounded-lg bg-muted text-[13px] focus:outline-none border-0"
                    />
                  </div>
                  {loadingBooks ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : filteredBooks.length === 0 ? (
                    <p className="text-[13px] text-muted-foreground text-center py-6">No tienes libros disponibles</p>
                  ) : (
                    <div className="space-y-1">
                      {filteredBooks.map((book) => {
                        const isSelected = selectedBooks.some(b => b.id === book.id);
                        return (
                          <button
                            key={book.id}
                            onClick={() => toggleBook(book)}
                            className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left ${
                              isSelected ? "bg-primary/10" : "hover:bg-muted/50"
                            }`}
                          >
                            {book.cover_url ? (
                              <img src={book.cover_url} alt="" className="w-8 h-12 rounded object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                <BookOpen className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] font-medium truncate">{book.title}</p>
                              {book.genre && <p className="text-[11px] text-muted-foreground">{book.genre}</p>}
                            </div>
                            {isSelected && <Check className="w-5 h-5 text-primary flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-border">
                <button
                  onClick={handleCreateSaga}
                  disabled={creating || !sagaTitle.trim() || selectedBooks.length < 2}
                  className="w-full h-11 bg-primary text-primary-foreground rounded-xl font-semibold text-[15px] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Library className="w-5 h-5" />}
                  Crear Saga ({selectedBooks.length} libros)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <IOSBottomNav />
    </div>
  );
};

export default WriteSelectorPage;
