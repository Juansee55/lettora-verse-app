import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Edit3, BookOpen, Heart, Eye, Plus, Loader2, Settings, Share2,
  Grid3X3, List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import IOSBottomNav from "@/components/navigation/IOSBottomNav";
import ShareProfileAsImage from "@/components/share/ShareProfileAsImage";
import FloatingHearts from "@/components/valentines/FloatingHearts";
import LevelBadge from "@/components/levels/LevelBadge";
import { useUserLevel } from "@/hooks/useUserLevel";

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

interface EquippedItems {
  frame: string | null;
  background: string | null;
  nameColor: string | null;
}

type UserRole = "admin" | "moderator" | null;

const ProfilePage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"grid" | "list">("grid");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [stats, setStats] = useState<Stats>({ books: 0, followers: 0, following: 0, totalReads: 0, totalLikes: 0 });
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const [equippedItems, setEquippedItems] = useState<EquippedItems>({ frame: null, background: null, nameColor: null });
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { levelData } = useUserLevel(currentUserId);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    setCurrentUserId(user.id);

    const [profileRes, booksRes, followersRes, followingRes, equippedRes, roleRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("books").select("id, title, cover_url, reads_count, likes_count, status").eq("author_id", user.id).order("created_at", { ascending: false }),
      supabase.from("followers").select("*", { count: "exact", head: true }).eq("following_id", user.id),
      supabase.from("followers").select("*", { count: "exact", head: true }).eq("follower_id", user.id),
      supabase.from("user_items").select("item_id, is_equipped, profile_items(css_value, item_type)").eq("user_id", user.id).eq("is_equipped", true),
      supabase.from("user_roles").select("role").eq("user_id", user.id).in("role", ["admin", "moderator"]).maybeSingle(),
    ]);

    if (profileRes.data) setProfile(profileRes.data);
    if (booksRes.data) {
      setBooks(booksRes.data);
      const totalReads = booksRes.data.reduce((acc, b) => acc + (b.reads_count || 0), 0);
      const totalLikes = booksRes.data.reduce((acc, b) => acc + (b.likes_count || 0), 0);
      setStats(prev => ({ ...prev, books: booksRes.data!.length, totalReads, totalLikes }));
    }
    setStats(prev => ({
      ...prev,
      followers: followersRes.count || 0,
      following: followingRes.count || 0,
    }));

    // Process equipped items
    if (equippedRes.data) {
      const items = equippedRes.data as any[];
      items.forEach(item => {
        if (item.profile_items?.item_type === "frame") {
          setEquippedItems(prev => ({ ...prev, frame: item.profile_items.css_value }));
        } else if (item.profile_items?.item_type === "background") {
          setEquippedItems(prev => ({ ...prev, background: item.profile_items.css_value }));
        } else if (item.profile_items?.item_type === "name_color") {
          setEquippedItems(prev => ({ ...prev, nameColor: item.profile_items.css_value }));
        }
      });
    }

    if (roleRes.data) setUserRole(roleRes.data.role as UserRole);
    setLoading(false);
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

  return (
    <div className="min-h-screen bg-background pb-24">
      <FloatingHearts />
      {/* iOS Header */}
      <header className="sticky top-0 z-50 bg-background/70 backdrop-blur-2xl border-b border-border/30">
        <div className="flex items-center justify-between px-4 h-[52px]">
          <h1 className="text-[17px] font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            @{profile?.username || "usuario"}
          </h1>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => setShowShare(true)}>
              <Share2 className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => navigate("/settings")}>
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Profile Cover / Background */}
      {equippedItems.background && (
        <div className={`h-24 ${equippedItems.background}`} />
      )}

      {/* Profile Info */}
      <div className={`px-4 ${equippedItems.background ? "pt-0 -mt-10" : "pt-5"}`}>
        <div className="flex items-start gap-5">
          {/* Avatar with Frame */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`relative ${
              userRole === "admin" ? "admin-frame-premium" : userRole === "moderator" ? "mod-frame" : ""
            }`}
          >
            <div className={`w-20 h-20 rounded-full overflow-hidden ring-2 ring-background ${equippedItems.frame || "bg-gradient-hero"}`}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-primary-foreground">
                  {profile?.display_name?.[0]?.toUpperCase() || "?"}
                </div>
              )}
            </div>
            {equippedItems.frame && !userRole && (
              <div className={`absolute -inset-1 rounded-full ${equippedItems.frame} pointer-events-none`} />
            )}
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
          <h2 className={`text-[15px] font-semibold ${equippedItems.nameColor || ""}`}>
            {profile?.display_name || "Usuario"}
          </h2>
          {profile?.bio && (
            <p className="text-[15px] text-muted-foreground mt-1 leading-snug">{profile.bio}</p>
          )}
        </div>

        {/* Level + Inventory badges */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {levelData && <LevelBadge levelData={levelData} compact />}
          <button
            onClick={() => navigate("/inventory")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 rounded-full"
          >
            <Heart className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-[13px] font-semibold text-rose-500">Inventario</span>
          </button>
        </div>

        {/* Level Progress Card */}
        {levelData && (
          <div className="mt-3">
            <LevelBadge levelData={levelData} showProgress />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-xl h-9 text-[13px]"
            onClick={() => navigate("/edit-profile")}
          >
            <Edit3 className="w-3.5 h-3.5 mr-1.5" />
            Editar perfil
          </Button>
          <Button
            size="sm"
            className="flex-1 rounded-xl h-9 text-[13px]"
            onClick={() => navigate("/write")}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Nuevo libro
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-3 mt-4">
          <div className="flex-1 bg-card rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Eye className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[16px] font-semibold">{formatNumber(stats.totalReads)}</p>
              <p className="text-[12px] text-muted-foreground">Lecturas</p>
            </div>
          </div>
          <div className="flex-1 bg-card rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-rose-500/10 flex items-center justify-center">
              <Heart className="w-4 h-4 text-rose-500" />
            </div>
            <div>
              <p className="text-[16px] font-semibold">{formatNumber(stats.totalLikes)}</p>
              <p className="text-[12px] text-muted-foreground">Me gusta</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t border-border/50 mt-5">
        <div className="flex">
          <button
            onClick={() => setActiveTab("grid")}
            className={`flex-1 py-3 flex justify-center border-b-2 transition-colors ${
              activeTab === "grid" ? "border-foreground" : "border-transparent text-muted-foreground"
            }`}
          >
            <Grid3X3 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`flex-1 py-3 flex justify-center border-b-2 transition-colors ${
              activeTab === "list" ? "border-foreground" : "border-transparent text-muted-foreground"
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
                        <Eye className="w-4 h-4" /> {formatNumber(book.reads_count || 0)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-4 h-4" /> {formatNumber(book.likes_count || 0)}
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
                        <Eye className="w-3.5 h-3.5" /> {formatNumber(book.reads_count || 0)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5" /> {formatNumber(book.likes_count || 0)}
                      </span>
                    </div>
                  </div>
                  {book.status === "draft" && (
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 text-[11px] rounded-full">
                      Borrador
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
          )
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-[17px] font-semibold mb-1">No tienes libros aún</h3>
            <p className="text-[15px] text-muted-foreground mb-5">
              ¡Empieza a escribir tu primera historia!
            </p>
            <Button className="rounded-full h-10 px-6" onClick={() => navigate("/write")}>
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
