import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Clock, Heart, Grid3X3, List, Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/navigation/BottomNav";

const tabs = [
  { key: "reading", label: "Leyendo", icon: BookOpen },
  { key: "completed", label: "Completados", icon: Clock },
  { key: "favorites", label: "Favoritos", icon: Heart },
];

const libraryBooks = [
  {
    id: "1",
    title: "El Último Amanecer",
    author: "María García",
    cover: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&h=280&fit=crop",
    progress: 65,
    status: "reading",
  },
  {
    id: "2",
    title: "Sombras del Pasado",
    author: "Carlos Ruiz",
    cover: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=200&h=280&fit=crop",
    progress: 100,
    status: "completed",
  },
  {
    id: "3",
    title: "Versos del Alma",
    author: "Ana López",
    cover: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=200&h=280&fit=crop",
    progress: 30,
    status: "reading",
  },
  {
    id: "4",
    title: "El Viajero Eterno",
    author: "Pedro Martín",
    cover: "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=200&h=280&fit=crop",
    progress: 100,
    status: "favorites",
  },
];

const LibraryPage = () => {
  const [activeTab, setActiveTab] = useState("reading");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const navigate = useNavigate();

  const filteredBooks = libraryBooks.filter((book) => {
    if (activeTab === "reading") return book.progress < 100;
    if (activeTab === "completed") return book.progress === 100;
    return book.status === activeTab;
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-display font-bold">Mi Biblioteca</h1>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </motion.header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {filteredBooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mb-4">
              <BookOpen className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Tu biblioteca está vacía</h3>
            <p className="text-muted-foreground mb-4">
              Explora y añade libros a tu colección
            </p>
            <Button variant="hero" onClick={() => navigate("/explore")}>
              Explorar libros
            </Button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {filteredBooks.map((book, index) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => navigate(`/book/${book.id}`)}
                className="cursor-pointer group"
              >
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-3 shadow-card">
                  <img
                    src={book.cover}
                    alt={book.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  {book.progress < 100 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${book.progress}%` }}
                      />
                    </div>
                  )}
                </div>
                <h3 className="font-medium text-sm line-clamp-1">{book.title}</h3>
                <p className="text-xs text-muted-foreground">{book.author}</p>
                {book.progress < 100 && (
                  <p className="text-xs text-primary mt-1">{book.progress}% leído</p>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBooks.map((book, index) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => navigate(`/book/${book.id}`)}
                className="flex gap-4 p-3 bg-card rounded-xl cursor-pointer hover:shadow-soft transition-shadow"
              >
                <div className="w-16 h-24 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={book.cover}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium line-clamp-1">{book.title}</h3>
                  <p className="text-sm text-muted-foreground">{book.author}</p>
                  {book.progress < 100 && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Progreso</span>
                        <span>{book.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${book.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default LibraryPage;
