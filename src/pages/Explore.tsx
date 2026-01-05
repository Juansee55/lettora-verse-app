import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Filter, TrendingUp, Clock, Star, BookOpen, Users, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/navigation/BottomNav";
import BookCard from "@/components/books/BookCard";

const categories = [
  { name: "Todos", icon: Sparkles },
  { name: "Romance", icon: Heart },
  { name: "Fantasía", icon: Star },
  { name: "Misterio", icon: Search },
  { name: "Poesía", icon: BookOpen },
  { name: "Drama", icon: Users },
];

import { Heart } from "lucide-react";

const allBooks = [
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
    category: "Fantasía",
  },
];

const ExplorePage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const navigate = useNavigate();

  const filteredBooks = allBooks.filter((book) => {
    const matchesSearch =
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      activeCategory === "Todos" || book.category === activeCategory;
    return matchesSearch && matchesCategory;
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
          <h1 className="text-2xl font-display font-bold mb-4">Explorar</h1>

          {/* Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar libros, autores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-12 rounded-xl bg-muted/50"
              />
            </div>
            <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl">
              <Filter className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Categories */}
      <div className="px-4 py-4 overflow-x-auto">
        <div className="flex gap-2">
          {categories.map((cat, index) => (
            <motion.button
              key={cat.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setActiveCategory(cat.name)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                activeCategory === cat.name
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              <cat.icon className="w-4 h-4" />
              {cat.name}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Top Writers */}
      <section className="px-4 mb-6">
        <h2 className="text-lg font-display font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Escritores destacados
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {["María G.", "Carlos R.", "Ana L.", "Pedro M.", "Elena V."].map((writer, index) => (
            <motion.div
              key={writer}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-xl font-display font-bold text-primary-foreground">
                {writer[0]}
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{writer}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Results */}
      <section className="px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-semibold">
            {filteredBooks.length} resultados
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {filteredBooks.map((book, index) => (
            <motion.div
              key={book.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <BookCard book={book} />
            </motion.div>
          ))}
        </div>
      </section>

      <BottomNav />
    </div>
  );
};

export default ExplorePage;
