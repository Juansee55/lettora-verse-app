import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Edit3,
  BookOpen,
  Users,
  Heart,
  Eye,
  Camera,
  List,
  Plus,
  Loader2,
  LogOut,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/navigation/BottomNav";
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
  const [activeTab, setActiveTab] = useState<"books" | "likes" | "sagas">("books");
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

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) setProfile(profileData);

      // Fetch user's books
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

      // Fetch followers count
      const { count: followersCount } = await supabase
        .from("followers")
        .select("*", { count: "exact", head: true })
        .eq("following_id", user.id);

      // Fetch following count
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

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

  const statsList = [
    { label: "Libros", value: stats.books, icon: BookOpen },
    { label: "Seguidores", value: stats.followers, icon: Users },
    { label: "Siguiendo", value: stats.following, icon: Heart },
    { label: "Lecturas", value: formatNumber(stats.totalReads), icon: Eye },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="relative">
        {/* Banner */}
        <div
          className="h-32 bg-gradient-hero relative"
          style={
            profile?.cover_url
              ? { backgroundImage: `url(${profile.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
        >
          <button
            onClick={() => navigate("/edit-profile")}
            className="absolute bottom-2 right-2 w-8 h-8 bg-card/80 backdrop-blur-sm rounded-full flex items-center justify-center"
          >
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
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-display font-bold text-primary-foreground">
                  {profile?.display_name?.[0]?.toUpperCase() || "?"}
                </div>
              )}
            </motion.div>
            <button
              onClick={() => navigate("/edit-profile")}
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-md"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-display font-bold">
                {profile?.display_name || "Usuario"}
              </h1>
              <p className="text-muted-foreground">
                @{profile?.username || "usuario"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setShowShare(true)}>
                <Share2 className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => navigate("/edit-profile")}>
                <Edit3 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {profile?.bio && (
            <p className="text-sm text-foreground mb-4">{profile.bio}</p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {statsList.map((stat, index) => (
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
        {books.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {books.map((book, index) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => navigate(`/book/${book.id}`)}
                className="aspect-[3/4] rounded-xl overflow-hidden cursor-pointer relative group"
              >
                <img
                  src={book.cover_url || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&h=280&fit=crop"}
                  alt={book.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                  <p className="text-primary-foreground text-xs line-clamp-2">{book.title}</p>
                </div>
                {book.status === "draft" && (
                  <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-500/80 rounded-full text-xs text-white">
                    Borrador
                  </div>
                )}
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
        ) : (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No tienes libros aún</h3>
            <p className="text-muted-foreground mb-4">
              ¡Empieza a escribir tu primera historia!
            </p>
            <Button variant="hero" onClick={() => navigate("/write")}>
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

      <BottomNav />
    </div>
  );
};

export default ProfilePage;
