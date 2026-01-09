import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Users,
  Heart,
  Eye,
  MapPin,
  Link as LinkIcon,
  Calendar,
  MoreHorizontal,
  UserPlus,
  UserCheck,
  MessageCircle,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/navigation/BottomNav";
import ShareProfileAsImage from "@/components/share/ShareProfileAsImage";

interface UserProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  location: string | null;
  website: string | null;
  is_verified: boolean;
  created_at: string;
}

interface Book {
  id: string;
  title: string;
  cover_url: string | null;
  reads_count: number;
  likes_count: number;
}

const UserProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"books" | "microstories">("books");
  const [showShare, setShowShare] = useState(false);
  const [totalLikes, setTotalLikes] = useState(0);

  useEffect(() => {
    if (userId) {
      fetchProfile();
      fetchBooks();
      fetchFollowCounts();
      checkIfFollowing();
    }
  }, [userId]);

  const checkIfFollowing = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !userId) return;
    setCurrentUserId(user.id);

    const { data } = await supabase
      .from("followers")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", userId)
      .maybeSingle();

    setIsFollowing(!!data);
  };

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
    } else {
      setProfile(data);
    }
    setLoading(false);
  };

  const fetchBooks = async () => {
    const { data, error } = await supabase
      .from("books")
      .select("id, title, cover_url, reads_count, likes_count")
      .eq("author_id", userId)
      .in("status", ["published", "completed"])
      .order("created_at", { ascending: false });

    if (!error && data) {
      setBooks(data);
      const likes = data.reduce((acc, b) => acc + (b.likes_count || 0), 0);
      setTotalLikes(likes);
    }
  };

  const fetchFollowCounts = async () => {
    // Followers
    const { count: followers } = await supabase
      .from("followers")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId);

    // Following
    const { count: following } = await supabase
      .from("followers")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId);

    setFollowersCount(followers || 0);
    setFollowingCount(following || 0);
  };

  const handleFollow = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Necesitas iniciar sesión para seguir usuarios.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (isFollowing) {
      // Unfollow
      await supabase
        .from("followers")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", userId);
      setIsFollowing(false);
      setFollowersCount((prev) => prev - 1);
      toast({
        title: "Dejaste de seguir",
        description: `Ya no sigues a ${profile?.display_name || "este usuario"}.`,
      });
    } else {
      // Follow
      const { error } = await supabase.from("followers").insert({
        follower_id: user.id,
        following_id: userId,
      });

      if (!error) {
        setIsFollowing(true);
        setFollowersCount((prev) => prev + 1);
        toast({
          title: "¡Siguiendo!",
          description: `Ahora sigues a ${profile?.display_name || "este usuario"}.`,
        });
      }
    }
  };

  const startConversation = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Necesitas iniciar sesión para enviar mensajes.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    // Check if conversation already exists
    const { data: myConversations } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (myConversations) {
      for (const conv of myConversations) {
        const { data: otherParticipant } = await supabase
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", conv.conversation_id)
          .eq("user_id", userId)
          .maybeSingle();

        if (otherParticipant) {
          navigate(`/chat/${conv.conversation_id}`);
          return;
        }
      }
    }

    // Create new conversation
    const { data: newConv, error: convError } = await supabase
      .from("conversations")
      .insert({ is_group: false })
      .select()
      .single();

    if (convError || !newConv) {
      toast({
        title: "Error",
        description: "No se pudo crear la conversación.",
        variant: "destructive",
      });
      return;
    }

    // Add participants
    await supabase.from("conversation_participants").insert([
      { conversation_id: newConv.id, user_id: user.id },
      { conversation_id: newConv.id, user_id: userId },
    ]);

    navigate(`/chat/${newConv.id}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <h2 className="font-display font-semibold text-xl mb-2">Usuario no encontrado</h2>
        <p className="text-muted-foreground mb-4">Este perfil no existe o ha sido eliminado.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Volver
        </Button>
      </div>
    );
  }

  const isOwnProfile = currentUserId === userId;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="relative">
        {/* Banner */}
        <div 
          className="h-40 bg-gradient-hero relative"
          style={profile.cover_url ? { 
            backgroundImage: `url(${profile.cover_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center"
          } : {}}
        >
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 left-4 bg-background/50 backdrop-blur-sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 right-4 bg-background/50 backdrop-blur-sm"
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>

        {/* Profile Info */}
        <div className="px-4 pb-4">
          {/* Avatar */}
          <div className="relative -mt-16 mb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="w-28 h-28 rounded-2xl bg-gradient-to-br from-violet-400 to-violet-600 border-4 border-background shadow-glow overflow-hidden"
            >
              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={profile.display_name || ""} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-display font-bold text-primary-foreground">
                  {profile.display_name?.[0] || profile.username?.[0] || "?"}
                </div>
              )}
            </motion.div>
            {profile.is_verified && (
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
                ✓
              </div>
            )}
          </div>

          {/* Name and actions */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-display font-bold">{profile.display_name || "Usuario"}</h1>
                {profile.is_verified && (
                  <span className="text-primary">✓</span>
                )}
              </div>
              <p className="text-muted-foreground">@{profile.username || "user"}</p>
            </div>
            {!isOwnProfile && (
              <div className="flex gap-2">
                <Button 
                  variant={isFollowing ? "outline" : "hero"} 
                  size="sm"
                  onClick={handleFollow}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="w-4 h-4 mr-1" />
                      Siguiendo
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-1" />
                      Seguir
                    </>
                  )}
                </Button>
                <Button variant="outline" size="icon" onClick={startConversation}>
                  <MessageCircle className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setShowShare(true)}>
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm text-foreground mb-4">{profile.bio}</p>
          )}

          {/* Meta info */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-4">
            {profile.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {profile.location}
              </span>
            )}
            {profile.website && (
              <a 
                href={profile.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <LinkIcon className="w-4 h-4" />
                {profile.website.replace(/^https?:\/\//, "")}
              </a>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Desde {formatDate(profile.created_at)}
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Libros", value: books.length, icon: BookOpen },
              { label: "Seguidores", value: followersCount, icon: Users },
              { label: "Siguiendo", value: followingCount, icon: Heart },
              { label: "Lecturas", value: books.reduce((acc, b) => acc + b.reads_count, 0), icon: Eye },
            ].map((stat, index) => (
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
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-30 bg-background border-b border-border">
        <div className="flex">
          <button
            onClick={() => setActiveTab("books")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 border-b-2 transition-colors ${
              activeTab === "books"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="text-sm font-medium">Libros</span>
          </button>
          <button
            onClick={() => setActiveTab("microstories")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 border-b-2 transition-colors ${
              activeTab === "microstories"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Heart className="w-4 h-4" />
            <span className="text-sm font-medium">Microrrelatos</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {books.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-display font-semibold text-lg mb-2">Sin publicaciones</h3>
            <p className="text-muted-foreground">Este usuario aún no ha publicado nada.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {books.map((book, index) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(`/book/${book.id}`)}
                className="aspect-[3/4] rounded-xl overflow-hidden cursor-pointer relative group"
              >
                {book.cover_url ? (
                  <img
                    src={book.cover_url}
                    alt={book.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-hero flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-primary-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                  <div>
                    <p className="text-primary-foreground text-xs line-clamp-2 font-medium">{book.title}</p>
                    <p className="text-primary-foreground/70 text-xs">{book.reads_count} lecturas</p>
                  </div>
                </div>
              </motion.div>
            ))}
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
            followers: followersCount,
            totalLikes: totalLikes,
            totalReads: books.reduce((acc, b) => acc + b.reads_count, 0),
          }}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default UserProfilePage;
