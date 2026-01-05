import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Settings,
  Edit3,
  BookOpen,
  Users,
  Heart,
  Eye,
  Camera,
  Grid3X3,
  List,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/navigation/BottomNav";

const ProfilePage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"books" | "likes" | "sagas">("books");

  const stats = [
    { label: "Libros", value: 12, icon: BookOpen },
    { label: "Seguidores", value: 1240, icon: Users },
    { label: "Siguiendo", value: 86, icon: Heart },
    { label: "Lecturas", value: "45K", icon: Eye },
  ];

  const userBooks = [
    { id: "1", title: "Mi Primera Novela", cover: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&h=280&fit=crop", reads: 3400 },
    { id: "2", title: "Poemas del Atardecer", cover: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=200&h=280&fit=crop", reads: 1200 },
    { id: "3", title: "Historias Cortas", cover: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=200&h=280&fit=crop", reads: 890 },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="relative">
        {/* Banner */}
        <div className="h-32 bg-gradient-hero relative">
          <button className="absolute bottom-2 right-2 w-8 h-8 bg-card/80 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Camera className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Info */}
        <div className="px-4 pb-4">
          {/* Avatar */}
          <div className="relative -mt-12 mb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-400 to-violet-600 border-4 border-background shadow-glow overflow-hidden"
            >
              <div className="w-full h-full flex items-center justify-center text-3xl font-display font-bold text-primary-foreground">
                E
              </div>
            </motion.div>
            <button className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-md">
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-display font-bold">Escritor Demo</h1>
              <p className="text-muted-foreground">@escritor_demo</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => navigate("/settings")}>
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => navigate("/edit-profile")}>
                <Edit3 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <p className="text-sm text-foreground mb-4">
            📚 Amante de las historias que tocan el alma. Escribo sobre amor, misterio y fantasía.
            ✨ Cada palabra es un paso hacia la eternidad.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-card rounded-xl p-3 text-center shadow-soft"
              >
                <stat.icon className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="font-bold text-lg">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="hero" className="flex-1" onClick={() => navigate("/write")}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo libro
            </Button>
            <Button variant="outline" className="flex-1">
              Crear promoción
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-30 bg-background border-b border-border">
        <div className="flex">
          {[
            { key: "books", label: "Mis Libros", icon: BookOpen },
            { key: "likes", label: "Me gusta", icon: Heart },
            { key: "sagas", label: "Sagas", icon: List },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-3 gap-2">
          {userBooks.map((book, index) => (
            <motion.div
              key={book.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => navigate(`/book/${book.id}`)}
              className="aspect-[3/4] rounded-xl overflow-hidden cursor-pointer relative group"
            >
              <img
                src={book.cover}
                alt={book.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                <p className="text-primary-foreground text-xs line-clamp-2">{book.title}</p>
              </div>
            </motion.div>
          ))}

          {/* Add new book card */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            onClick={() => navigate("/write")}
            className="aspect-[3/4] rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <Plus className="w-8 h-8 text-muted-foreground" />
          </motion.div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;
