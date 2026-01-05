import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Home, 
  Search, 
  BookOpen, 
  MessageCircle, 
  User,
  Bell,
  TrendingUp,
  Clock,
  Heart,
  Eye,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/navigation/BottomNav";
import BookCard from "@/components/books/BookCard";

// Demo data for books
const demoBooks = [
  {
    id: "1",
    title: "El Último Amanecer",
    author: "María García",
    cover: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=400&fit=crop",
    reads: 12500,
    likes: 3420,
    category: "Romance",
  },
  {
    id: "2",
    title: "Sombras del Pasado",
    author: "Carlos Ruiz",
    cover: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=300&h=400&fit=crop",
    reads: 8900,
    likes: 2100,
    category: "Misterio",
  },
  {
    id: "3",
    title: "Versos del Alma",
    author: "Ana López",
    cover: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=300&h=400&fit=crop",
    reads: 5600,
    likes: 1800,
    category: "Poesía",
  },
  {
    id: "4",
    title: "El Viajero Eterno",
    author: "Pedro Martín",
    cover: "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=300&h=400&fit=crop",
    reads: 15000,
    likes: 4200,
    category: "Fantasía",
  },
];

const trendingBooks = [
  {
    id: "5",
    title: "Noches de Luna",
    author: "Elena Vega",
    cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&h=400&fit=crop",
    reads: 25000,
    likes: 8900,
    category: "Drama",
  },
  {
    id: "6",
    title: "El Secreto del Mar",
    author: "Juan Pérez",
    cover: "https://images.unsplash.com/photo-1509266272358-7701da638078?w=300&h=400&fit=crop",
    reads: 18000,
    likes: 6500,
    category: "Aventura",
  },
];

const HomePage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

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
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-hero rounded-xl flex items-center justify-center shadow-glow">
                <BookOpen className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-display font-bold text-gradient">Lettora</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-[10px] text-destructive-foreground flex items-center justify-center">
                  3
                </span>
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar libros, autores, géneros..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 rounded-xl bg-muted/50"
            />
          </div>
        </div>
      </motion.header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* Trending Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-display font-semibold">Tendencias</h2>
            </div>
            <Button variant="ghost" size="sm" className="text-primary">
              Ver más
            </Button>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
            {trendingBooks.map((book, index) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex-shrink-0"
              >
                <BookCard book={book} variant="featured" />
              </motion.div>
            ))}
          </div>
        </section>

        {/* Recent Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-display font-semibold">Recién publicados</h2>
            </div>
            <Button variant="ghost" size="sm" className="text-primary">
              Ver más
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {demoBooks.map((book, index) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <BookCard book={book} />
              </motion.div>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section>
          <h2 className="text-xl font-display font-semibold mb-4">Categorías</h2>
          <div className="flex flex-wrap gap-2">
            {["Romance", "Fantasía", "Misterio", "Poesía", "Drama", "Aventura", "Ciencia Ficción", "Terror"].map(
              (category, index) => (
                <motion.button
                  key={category}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="px-4 py-2 bg-secondary rounded-full text-sm font-medium text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {category}
                </motion.button>
              )
            )}
          </div>
        </section>
      </main>

      {/* FAB for creating new book */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
        onClick={() => navigate("/write")}
        className="fixed bottom-24 right-4 w-14 h-14 bg-gradient-hero rounded-2xl shadow-glow flex items-center justify-center z-50"
      >
        <Plus className="w-6 h-6 text-primary-foreground" />
      </motion.button>

      <BottomNav />
    </div>
  );
};

export default HomePage;
