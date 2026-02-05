import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Edit3,
  BookOpen,
  Users,
  Heart,
  Eye,
  Plus,
  Loader2,
  Settings,
  Share2,
  MoreHorizontal,
  Grid3X3,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import IOSBottomNav from "@/components/navigation/IOSBottomNav";
import ShareProfileAsImage from "@/components/share/ShareProfileAsImage";

interface Profile {
  id: string;
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
}

interface Book {
  id: string;
  title: string;
  cover_url: string | null;
  reads_count: number | null;
  likes_count: number | null;
  status: string | null;
}

interface Stats {
  books: number;
  followers: number;
  following: number;
  totalReads: number;
  totalLikes: number;
}

const ProfilePage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"grid" | "list">("grid");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [stats, setStats] = useState<Stats>({ books: 0, followers: 0, following: 0, totalReads: 0, totalLikes: 0 });
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) setProfile(profileData);

      const { data: booksData } = await supabase
        .from("books")
        .select("id, title, cover_url, reads_count, likes_count, status")
        .eq("author_id", user.id)
        .order("created_at", { ascending: false });

      if (booksData) {
        setBooks(booksData);
        const totalReads = booksData.reduce((acc, book) => acc + (book.reads_count || 0), 0);
        const totalLikes = booksData.reduce((acc, book) => acc + (book.likes_count || 0), 0);
        setStats((prev) => ({ ...prev, books: booksData.length, totalReads, totalLikes }));
      }

      const { count: followersCount } = await supabase
        .from("followers")
        .select("*", { count: "exact", head: true })
        .eq("following_id", user.id);

      const { count: followingCount } = await supabase
        .from("followers")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", user.id);

      setStats((prev) => ({
        ...prev,
        followers: followersCount || 0,
        following: followingCount || 0,
      }));

      setLoading(false);
    };

    fetchProfileData();
  }, [navigate]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* iOS Header */}
      <header className="sticky top-0 z-50 bg-background/70 backdrop-blur-2xl border-b border-border/30">
        <div className="flex items-center justify-between px-4 h-[52px]">
          <h1 className="text-[17px] font-semibold">
            @{profile?.username || "usuario"}
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="ios-ghost" size="icon" onClick={() => setShowShare(true)}>
              <Share2 className="w-5 h-5" />
            </Button>
            <Button variant="ios-ghost" size="icon" onClick={() => navigate("/settings")}>
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Profile Info */}
      <div className="px-4 py-5">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-hero overflow-hidden ring-2 ring-background">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-primary-foreground">
                  {profile?.display_name?.[0]?.toUpperCase() || "?"}
                </div>
              )}
            </div>
          </motion.div>

          {/* Stats */}
          <div className="flex-1 flex justify-around pt-2">
            <div className="text-center">
              <p className="text-[20px] font-bold">{stats.books}</p>
              <p className="text-[13px] text-muted-foreground">Libros</p>
            </div>
            <div className="text-center">
              <p className="text-[20px] font-bold">{formatNumber(stats.followers)}</p>
              <p className="text-[13px] text-muted-foreground">Seguidores</p>
            </div>
            <div className="text-center">
              <p className="text-[20px] font-bold">{formatNumber(stats.following)}</p>
              <p className="text-[13px] text-muted-foreground">Siguiendo</p>
            </div>
          </div>
        </div>

        {/* Name & Bio */}
        <div className="mt-4">
          <h2 className="text-[15px] font-semibold">
            {profile?.display_name || "Usuario"}
          </h2>
          {profile?.bio && (
            <p className="text-[15px] text-muted-foreground mt-1 leading-snug">
              {profile.bio}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <Button
            variant="ios-secondary"
            size="ios-md"
            className="flex-1"
            onClick={() => navigate("/edit-profile")}
          >
            <Edit3 className="w-4 h-4 mr-1.5" />
            Editar perfil
          </Button>
          <Button
            variant="ios"
            size="ios-md"
            className="flex-1"
            onClick={() => navigate("/write")}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nuevo libro
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-3 mt-5">
          <div className="flex-1 bg-card rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Eye className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-[17px] font-semibold">{formatNumber(stats.totalReads)}</p>
              <p className="text-[13px] text-muted-foreground">Lecturas</p>
            </div>
          </div>
          <div className="flex-1 bg-card rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
              <Heart className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <p className="text-[17px] font-semibold">{formatNumber(stats.totalLikes)}</p>
              <p className="text-[13px] text-muted-foreground">Me gusta</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t border-border/50">
        <div className="flex">
          <button
            onClick={() => setActiveTab("grid")}
            className={`flex-1 py-3 flex justify-center border-b-2 transition-colors ${
              activeTab === "grid"
                ? "border-foreground"
                : "border-transparent text-muted-foreground"
            }`}
          >
            <Grid3X3 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`flex-1 py-3 flex justify-center border-b-2 transition-colors ${
              activeTab === "list"
                ? "border-foreground"
                : "border-transparent text-muted-foreground"
            }`}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content Grid */}
      <div className="px-0.5 py-0.5">
        {books.length > 0 ? (
          activeTab === "grid" ? (
            <div className="grid grid-cols-3 gap-0.5">
              {books.map((book, index) => (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => navigate(`/book/${book.id}`)}
                  className="aspect-[3/4] relative cursor-pointer group"
                >
                  <img
                    src={book.cover_url || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&h=280&fit=crop"}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                  {book.status === "draft" && (
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-[10px] text-white">
                      Borrador
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex items-center gap-4 text-white text-sm">
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {formatNumber(book.reads_count || 0)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        {formatNumber(book.likes_count || 0)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {books.map((book, index) => (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => navigate(`/book/${book.id}`)}
                  className="flex items-center gap-3 p-3 active:bg-muted/50 cursor-pointer"
                >
                  <img
                    src={book.cover_url || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&h=280&fit=crop"}
                    alt={book.title}
                    className="w-12 h-16 rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{book.title}</p>
                    <div className="flex items-center gap-3 text-[13px] text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        {formatNumber(book.reads_count || 0)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5" />
                        {formatNumber(book.likes_count || 0)}
                      </span>
                    </div>
                  </div>
                  {book.status === "draft" && (
                    <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-600 text-[11px] rounded-full">
                      Borrador
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
          )
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-[17px] font-semibold mb-1">No tienes libros aún</h3>
            <p className="text-[15px] text-muted-foreground mb-5">
              ¡Empieza a escribir tu primera historia!
            </p>
            <Button variant="ios" size="ios-lg" onClick={() => navigate("/write")}>
              <Plus className="w-4 h-4 mr-2" />
              Crear libro
            </Button>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {profile && (
        <ShareProfileAsImage
          isOpen={showShare}
          onClose={() => setShowShare(false)}
          profile={profile}
          stats={{
            followers: stats.followers,
            totalLikes: stats.totalLikes,
            totalReads: stats.totalReads,
          }}
        />
      )}

      <IOSBottomNav />
    </div>
  );
};

export default ProfilePage;
