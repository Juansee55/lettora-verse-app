import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, BookOpen, Users, Heart, Eye, MapPin,
  Link as LinkIcon, Calendar, MoreHorizontal, UserPlus,
  UserCheck, MessageCircle, Share2, Flag, QrCode,
  Shield, X, Copy, Check, Sparkles, Ban, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/navigation/BottomNav";
import ShareProfileAsImage from "@/components/share/ShareProfileAsImage";
import ReportContentModal from "@/components/reports/ReportContentModal";
import FloatingHearts from "@/components/valentines/FloatingHearts";
import LevelBadge from "@/components/levels/LevelBadge";
import { useUserLevel } from "@/hooks/useUserLevel";
import PremiumBadge from "@/components/premium/PremiumBadge";
import { usePremium } from "@/hooks/usePremium";

interface UserProfileData {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  location: string | null;
  website: string | null;
  is_verified: boolean;
  is_private: boolean;
  created_at: string;
}

interface Book {
  id: string;
  title: string;
  cover_url: string | null;
  reads_count: number;
  likes_count: number;
}

interface MicrostoryItem {
  id: string;
  title: string | null;
  content: string;
  likes_count: number;
  created_at: string;
}

const UserProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [microstories, setMicrostories] = useState<MicrostoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isMutual, setIsMutual] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"books" | "microstories">("books");
  const [showShare, setShowShare] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [totalLikes, setTotalLikes] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockedByThem, setIsBlockedByThem] = useState(false);
  const [targetUserRole, setTargetUserRole] = useState<"admin" | "moderator" | null>(null);
  const [adminTitle, setAdminTitle] = useState<string | null>(null);
  const [equippedItems, setEquippedItems] = useState<{ frame: string | null; background: string | null; nameColor: string | null }>({ frame: null, background: null, nameColor: null });
  const { levelData } = useUserLevel(userId);
  const { premiumData } = usePremium(userId);

  useEffect(() => {
    if (userId) {
      fetchAll();
    }
  }, [userId]);

  const fetchAll = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    await Promise.all([
      fetchProfile(),
      fetchBooks(),
      fetchMicrostories(),
      fetchFollowCounts(),
      fetchTargetUserRole(),
      fetchEquippedItems(),
      user ? checkFollowStatus(user.id) : Promise.resolve(),
      user ? checkBlockStatus(user.id) : Promise.resolve(),
    ]);
    setLoading(false);
  };

  const fetchEquippedItems = async () => {
    const { data } = await supabase
      .from("user_items")
      .select("profile_items(css_value, item_type)")
      .eq("user_id", userId!)
      .eq("is_equipped", true);
    if (data) {
      const items: { frame: string | null; background: string | null; nameColor: string | null } = { frame: null, background: null, nameColor: null };
      (data as any[]).forEach(item => {
        if (item.profile_items?.item_type === "frame") items.frame = item.profile_items.css_value;
        else if (item.profile_items?.item_type === "background") items.background = item.profile_items.css_value;
        else if (item.profile_items?.item_type === "name_color") items.nameColor = item.profile_items.css_value;
      });
      setEquippedItems(items);
    }
  };

  const fetchTargetUserRole = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("role, admin_title")
      .eq("user_id", userId)
      .in("role", ["admin", "moderator"])
      .maybeSingle();
    if (data) {
      setTargetUserRole(data.role as "admin" | "moderator");
      setAdminTitle(data.admin_title);
    }
  };

  const checkBlockStatus = async (myId: string) => {
    const [{ data: blocked }, { data: blockedBy }] = await Promise.all([
      supabase.from("user_blocks" as any).select("id").eq("blocker_id", myId).eq("blocked_id", userId).maybeSingle(),
      supabase.from("user_blocks" as any).select("id").eq("blocker_id", userId).eq("blocked_id", myId).maybeSingle(),
    ]);
    setIsBlocked(!!blocked);
    setIsBlockedByThem(!!blockedBy);
  };

  const checkFollowStatus = async (myId: string) => {
    const [{ data: followData }, { data: mutualData }] = await Promise.all([
      supabase.from("followers").select("id").eq("follower_id", myId).eq("following_id", userId).maybeSingle(),
      supabase.from("followers").select("id").eq("follower_id", userId!).eq("following_id", myId).maybeSingle(),
    ]);
    setIsFollowing(!!followData);
    setIsMutual(!!followData && !!mutualData);
  };

  const fetchProfile = async () => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (data) setProfile(data);
  };

  const fetchBooks = async () => {
    const { data } = await supabase
      .from("books")
      .select("id, title, cover_url, reads_count, likes_count")
      .eq("author_id", userId)
      .in("status", ["published", "completed"])
      .order("created_at", { ascending: false });
    if (data) {
      setBooks(data);
      setTotalLikes(data.reduce((acc, b) => acc + (b.likes_count || 0), 0));
    }
  };

  const fetchMicrostories = async () => {
    const { data } = await supabase
      .from("microstories")
      .select("id, title, content, likes_count, created_at")
      .eq("author_id", userId)
      .order("created_at", { ascending: false });
    if (data) setMicrostories(data);
  };

  const fetchFollowCounts = async () => {
    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase.from("followers").select("*", { count: "exact", head: true }).eq("following_id", userId),
      supabase.from("followers").select("*", { count: "exact", head: true }).eq("follower_id", userId),
    ]);
    setFollowersCount(followers || 0);
    setFollowingCount(following || 0);
  };

  const handleFollow = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    if (isFollowing) {
      await supabase.from("followers").delete().eq("follower_id", user.id).eq("following_id", userId);
      setIsFollowing(false);
      setIsMutual(false);
      setFollowersCount(p => p - 1);
    } else {
      await supabase.from("followers").insert({ follower_id: user.id, following_id: userId });
      setIsFollowing(true);
      setFollowersCount(p => p + 1);
      // Check if now mutual
      const { data: mutualCheck } = await supabase.from("followers").select("id").eq("follower_id", userId!).eq("following_id", user.id).maybeSingle();
      setIsMutual(!!mutualCheck);
    }
  };

  const startConversation = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    // Check existing conversation
    const { data: myConversations } = await supabase
      .from("conversation_participants").select("conversation_id").eq("user_id", user.id);

    if (myConversations) {
      for (const conv of myConversations) {
        const { data: other } = await supabase
          .from("conversation_participants").select("user_id")
          .eq("conversation_id", conv.conversation_id).eq("user_id", userId).maybeSingle();
        if (other) { navigate(`/chat/${conv.conversation_id}`); return; }
      }
    }

    // Create new conversation
    const { data: newConv, error } = await supabase
      .from("conversations").insert({ is_group: false }).select().single();
    if (error || !newConv) { toast({ title: "Error", variant: "destructive" }); return; }

    // Sequential insert (self first for RLS)
    await supabase.from("conversation_participants").insert({ conversation_id: newConv.id, user_id: user.id });
    await supabase.from("conversation_participants").insert({ conversation_id: newConv.id, user_id: userId });

    navigate(`/chat/${newConv.id}`);
  };

  const copyProfileLink = () => {
    const url = `${window.location.origin}/user/${userId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "¡Enlace copiado!" });
  };

  const handleBlockUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    if (isBlocked) {
      await (supabase.from("user_blocks" as any).delete().eq("blocker_id", user.id).eq("blocked_id", userId) as any);
      setIsBlocked(false);
      toast({ title: "Usuario desbloqueado" });
    } else {
      await (supabase.from("user_blocks" as any).insert({ blocker_id: user.id, blocked_id: userId }) as any);
      setIsBlocked(true);
      // Also unfollow if following
      if (isFollowing) {
        await supabase.from("followers").delete().eq("follower_id", user.id).eq("following_id", userId);
        setIsFollowing(false);
        setFollowersCount(p => p - 1);
      }
      toast({ title: "Usuario bloqueado", description: "Ya no verás su contenido." });
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  const formatShortDate = (dateString: string) => {
    const d = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(diff / 86400000);
    if (days < 30) return `${days}d`;
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
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
        <Button variant="outline" onClick={() => navigate(-1)}>Volver</Button>
      </div>
    );
  }

  const isOwnProfile = currentUserId === userId;
  const isPrivateAndLocked = profile?.is_private && !isFollowing && !isOwnProfile;
  const profileUrl = `${window.location.origin}/user/${userId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(profileUrl)}&size=200x200&bgcolor=ffffff&color=6B46C1`;

  return (
    <div className="min-h-screen bg-background pb-24">
      <FloatingHearts />
      {/* Cover + Navigation */}
      <div className="relative">
        <div
          className="h-44 bg-gradient-hero"
          style={profile.cover_url ? {
            backgroundImage: `url(${profile.cover_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          } : {}}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent" />
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
            <Button variant="ghost" size="icon" className="bg-black/30 backdrop-blur-sm text-white hover:bg-black/50" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="bg-black/30 backdrop-blur-sm text-white hover:bg-black/50" onClick={() => setShowMore(true)}>
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Profile Card */}
        <div className="px-4 -mt-16 relative z-10">
          <div className="ios-section p-5">
            <div className="flex items-end gap-4 mb-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className={`relative w-24 h-24 rounded-2xl bg-gradient-hero border-4 border-card shadow-lg overflow-hidden flex-shrink-0 -mt-16 ${
                  targetUserRole === "admin" ? "admin-frame-square" : targetUserRole === "moderator" ? "mod-frame" : equippedItems.frame || ""
                }`}
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-display font-bold text-primary-foreground">
                    {profile.display_name?.[0] || "?"}
                  </div>
                )}
              </motion.div>
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h1 className={`text-xl font-display font-bold truncate ${
                    targetUserRole === "admin" ? "admin-name-gold" : equippedItems.nameColor || ""
                  }`}>{profile.display_name || "Usuario"}</h1>
                  {adminTitle && (
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      targetUserRole === "admin"
                        ? "bg-amber-500/15 text-amber-500"
                        : "bg-slate-400/15 text-slate-400"
                    }`}>
                      {adminTitle}
                    </span>
                  )}
                  {targetUserRole && (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      targetUserRole === "admin"
                        ? "bg-amber-500/20 text-amber-500"
                        : "bg-slate-400/20 text-slate-400"
                    }`}>
                      {targetUserRole}
                    </span>
                  )}
                  {premiumData.isPremium && <PremiumBadge compact />}
                  {profile.is_verified && (
                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <p className="text-[15px] text-muted-foreground">@{profile.username || "user"}</p>
                  {profile.is_private && (
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  {levelData && <LevelBadge levelData={levelData} compact />}
                  {isMutual && !isOwnProfile && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-[11px] font-semibold rounded-full">
                      <Users className="w-3 h-3" /> Mutuos
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            {!isOwnProfile && (
              <div className="flex gap-2 mb-4">
                <Button
                  variant={isFollowing ? "outline" : "ios"}
                  size="ios-md"
                  className="flex-1"
                  onClick={handleFollow}
                >
                  {isFollowing ? (
                    <><UserCheck className="w-4 h-4 mr-1.5" /> Siguiendo</>
                  ) : (
                    <><UserPlus className="w-4 h-4 mr-1.5" /> Seguir</>
                  )}
                </Button>
                <Button variant="ios-secondary" size="ios-md" onClick={startConversation}>
                  <MessageCircle className="w-4 h-4" />
                </Button>
                <Button variant="ios-secondary" size="ios-md" onClick={() => setShowShare(true)}>
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button variant="ios-secondary" size="ios-md" onClick={() => setShowQR(true)}>
                  <QrCode className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Bio */}
            {profile.bio && (
              <p className="text-[15px] leading-relaxed mb-4">{profile.bio}</p>
            )}

            {/* Info pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              {profile.location && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-muted/60 rounded-full text-[13px] text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" /> {profile.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-muted/60 rounded-full text-[13px] text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" /> Desde {formatDate(profile.created_at)}
              </span>
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 rounded-full text-[13px] text-primary font-medium"
                >
                  <LinkIcon className="w-3.5 h-3.5" /> {profile.website.replace(/^https?:\/\//, "").slice(0, 25)}
                </a>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Libros", value: books.length, icon: BookOpen },
                { label: "Seguidores", value: followersCount, icon: Users },
                { label: "Siguiendo", value: followingCount, icon: Heart },
                { label: "Lecturas", value: books.reduce((a, b) => a + (b.reads_count || 0), 0), icon: Eye },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="text-center py-2"
                >
                  <p className="font-bold text-lg">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isPrivateAndLocked ? (
        /* Private Profile Locked View */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 px-6 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <Shield className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-display font-bold mb-2">Cuenta privada</h3>
          <p className="text-muted-foreground text-[15px] mb-6 max-w-xs">
            Sigue a este usuario para ver sus libros, microrrelatos y actividad.
          </p>
          {!isFollowing && (
            <Button variant="ios" size="ios-lg" onClick={handleFollow} className="px-8">
              <UserPlus className="w-4 h-4 mr-2" />
              Solicitar seguir
            </Button>
          )}
        </motion.div>
      ) : (
        <>
          {/* Tabs */}
          <div className="sticky top-0 z-30 bg-background/70 backdrop-blur-2xl border-b border-border/50 mt-4">
            <div className="flex">
              {[
                { key: "books" as const, icon: BookOpen, label: "Libros", count: books.length },
                { key: "microstories" as const, icon: Sparkles, label: "Microrrelatos", count: microstories.length },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 border-b-2 transition-colors ${
                    activeTab === tab.key ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="text-[14px] font-medium">{tab.label}</span>
                  <span className="text-[11px] bg-muted px-1.5 py-0.5 rounded-full">{tab.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-4 py-4">
            {activeTab === "books" ? (
              books.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-display font-semibold text-lg mb-2">Sin libros publicados</h3>
                  <p className="text-muted-foreground text-[15px]">Este usuario aún no ha publicado libros.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {books.map((book, i) => (
                    <motion.div
                      key={book.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => navigate(`/book/${book.id}`)}
                      className="aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer relative group"
                    >
                      {book.cover_url ? (
                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full bg-gradient-hero flex items-center justify-center">
                          <BookOpen className="w-8 h-8 text-primary-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <div>
                          <p className="text-white text-xs font-medium line-clamp-2">{book.title}</p>
                          <p className="text-white/70 text-[10px]">{book.reads_count} lecturas</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )
            ) : (
              microstories.length === 0 ? (
                <div className="text-center py-12">
                  <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-display font-semibold text-lg mb-2">Sin microrrelatos</h3>
                  <p className="text-muted-foreground text-[15px]">Este usuario aún no ha publicado microrrelatos.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {microstories.map((story, i) => (
                    <motion.div
                      key={story.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="ios-section p-4"
                    >
                      {story.title && <h4 className="font-display font-semibold text-[15px] mb-1">{story.title}</h4>}
                      <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{story.content}</p>
                      <div className="flex items-center gap-3 mt-2 text-[12px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {story.likes_count}</span>
                        <span>{formatShortDate(story.created_at)}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )
            )}
          </div>
        </>
      )}

      {/* More Options Sheet */}
      <AnimatePresence>
        {showMore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => setShowMore(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              onClick={e => e.stopPropagation()}
              className="absolute bottom-0 left-0 right-0 ios-sheet p-6 pb-10"
            >
              <div className="ios-pull-indicator" />
              <div className="space-y-1 mt-2">
                <button onClick={() => { setShowMore(false); copyProfileLink(); }} className="ios-item w-full rounded-xl">
                  <Copy className="w-5 h-5 text-primary" />
                  <span className="flex-1 text-left text-[17px]">Copiar enlace</span>
                </button>
                <button onClick={() => { setShowMore(false); setShowShare(true); }} className="ios-item w-full rounded-xl">
                  <Share2 className="w-5 h-5 text-primary" />
                  <span className="flex-1 text-left text-[17px]">Compartir perfil</span>
                </button>
                <button onClick={() => { setShowMore(false); setShowQR(true); }} className="ios-item w-full rounded-xl">
                  <QrCode className="w-5 h-5 text-primary" />
                  <span className="flex-1 text-left text-[17px]">Código QR</span>
                </button>
                {!isOwnProfile && (
                  <>
                    <button onClick={() => { setShowMore(false); handleBlockUser(); }} className="ios-item w-full rounded-xl text-amber-600">
                      <Ban className="w-5 h-5" />
                      <span className="flex-1 text-left text-[17px]">{isBlocked ? "Desbloquear usuario" : "Bloquear usuario"}</span>
                    </button>
                    <button onClick={() => { setShowMore(false); setShowReport(true); }} className="ios-item w-full rounded-xl text-destructive">
                      <Flag className="w-5 h-5" />
                      <span className="flex-1 text-left text-[17px]">Reportar usuario</span>
                    </button>
                  </>
                )}
              </div>
              <Button variant="ios-secondary" size="ios-lg" className="w-full mt-4" onClick={() => setShowMore(false)}>
                Cancelar
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Modal */}
      <AnimatePresence>
        {showQR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6"
            onClick={() => setShowQR(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-3xl p-8 text-center max-w-sm w-full"
            >
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-hero flex items-center justify-center text-2xl font-bold text-primary-foreground mb-4 overflow-hidden">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  profile.display_name?.[0] || "?"
                )}
              </div>
              <h3 className="font-display font-bold text-lg">{profile.display_name}</h3>
              <p className="text-muted-foreground text-[14px] mb-5">@{profile.username}</p>
              <div className="bg-white rounded-2xl p-4 inline-block mb-5">
                <img src={qrUrl} alt="QR Code" className="w-48 h-48" />
              </div>
              <p className="text-[13px] text-muted-foreground mb-4">Escanea para ver este perfil</p>
              <div className="flex gap-2">
                <Button variant="ios-secondary" className="flex-1" onClick={() => setShowQR(false)}>Cerrar</Button>
                <Button variant="ios" className="flex-1" onClick={copyProfileLink}>
                  {copied ? <><Check className="w-4 h-4 mr-1" /> Copiado</> : <><Copy className="w-4 h-4 mr-1" /> Copiar enlace</>}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Profile */}
      {profile && (
        <ShareProfileAsImage
          isOpen={showShare}
          onClose={() => setShowShare(false)}
          profile={profile}
          stats={{ followers: followersCount, totalLikes, totalReads: books.reduce((a, b) => a + (b.reads_count || 0), 0) }}
        />
      )}

      {/* Report Modal */}
      {showReport && (
        <ReportContentModal
          isOpen={showReport}
          onClose={() => setShowReport(false)}
          contentType="microstory"
          contentId={userId!}
          contentTitle={profile.display_name || profile.username || "Usuario"}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default UserProfilePage;
