import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Eye,
  Clock,
  ChevronRight,
  Play,
  MoreVertical,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ShareBookAsImage from "@/components/share/ShareBookAsImage";

interface BookData {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  genre: string | null;
  reads_count: number | null;
  likes_count: number | null;
  comments_count: number | null;
  status: string | null;
  tags: string[] | null;
  profiles: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface Chapter {
  id: string;
  title: string;
  chapter_number: number;
  word_count: number | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string | null;
  profiles: {
    display_name: string | null;
    username: string | null;
  } | null;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

const BookDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [book, setBook] = useState<BookData | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    const fetchBook = async () => {
      if (!id) return;

      // Fetch book
      const { data: bookData, error } = await supabase
        .from("books")
        .select(`
          id,
          title,
          description,
          cover_url,
          genre,
          reads_count,
          likes_count,
          comments_count,
          status,
          tags,
          profiles:author_id (
            id,
            display_name,
            username,
            avatar_url
          )
        `)
        .eq("id", id)
        .single();

      if (error || !bookData) {
        navigate("/home");
        return;
      }

      setBook(bookData as unknown as BookData);

      // Fetch chapters
      const { data: chaptersData } = await supabase
        .from("chapters")
        .select("id, title, chapter_number, word_count")
        .eq("book_id", id)
        .eq("is_published", true)
        .order("chapter_number", { ascending: true });

      if (chaptersData) setChapters(chaptersData);

      // Fetch comments
      const { data: commentsData } = await supabase
        .from("comments")
        .select(`
          id,
          content,
          created_at,
          profiles:user_id (
            display_name,
            username
          )
        `)
        .eq("commentable_id", id)
        .eq("commentable_type", "book")
        .order("created_at", { ascending: false })
        .limit(3);

      if (commentsData) setComments(commentsData as unknown as Comment[]);

      // Check if liked and saved
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: likeData } = await supabase
          .from("likes")
          .select("id")
          .eq("user_id", user.id)
          .eq("likeable_id", id)
          .eq("likeable_type", "book")
          .maybeSingle();

        setLiked(!!likeData);

        const { data: savedData } = await supabase
          .from("saved_books")
          .select("id")
          .eq("user_id", user.id)
          .eq("book_id", id)
          .maybeSingle();

        setSaved(!!savedData);
      }

      setLoading(false);
    };

    fetchBook();
  }, [id, navigate]);

  const handleLike = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    if (liked) {
      await supabase
        .from("likes")
        .delete()
        .eq("user_id", user.id)
        .eq("likeable_id", id)
        .eq("likeable_type", "book");
      setLiked(false);
    } else {
      await supabase.from("likes").insert({
        user_id: user.id,
        likeable_id: id!,
        likeable_type: "book",
      });
      setLiked(true);
    }
  };

  const handleFollow = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!book?.profiles?.id) return;

    await supabase.from("followers").insert({
      follower_id: user.id,
      following_id: book.profiles.id,
    });

    toast({
      title: "¡Siguiendo!",
      description: `Ahora sigues a ${book.profiles.display_name || book.profiles.username}`,
    });
  };

  const timeAgo = (date: string | null) => {
    if (!date) return "";
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!book) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative h-[50vh] min-h-[400px]">
        <img
          src={book.cover_url || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop"}
          alt={book.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
          <Button
            variant="glass"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Button variant="glass" size="icon" className="rounded-xl">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>

        {/* Book info overlay */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-0 left-0 right-0 p-6"
        >
          <span className="inline-block px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full mb-3">
            {book.genre || "General"}
          </span>
          <h1 className="text-3xl font-display font-bold mb-2">{book.title}</h1>

          <div className="flex items-center gap-3 mb-4">
            <div
              onClick={() => navigate(`/user/${book.profiles?.id}`)}
              className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-sm font-bold text-primary-foreground overflow-hidden cursor-pointer"
            >
              {book.profiles?.avatar_url ? (
                <img
                  src={book.profiles.avatar_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                book.profiles?.display_name?.[0]?.toUpperCase() || "?"
              )}
            </div>
            <span
              onClick={() => navigate(`/user/${book.profiles?.id}`)}
              className="font-medium cursor-pointer hover:text-primary"
            >
              {book.profiles?.display_name || book.profiles?.username || "Anónimo"}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full h-7 text-xs"
              onClick={handleFollow}
            >
              Seguir
            </Button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {formatNumber(book.reads_count || 0)}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              {formatNumber(book.likes_count || 0)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {chapters.length} cap.
            </span>
          </div>
        </motion.div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="hero" size="lg" className="flex-1">
            <Play className="w-5 h-5 mr-2" />
            Empezar a leer
          </Button>
          <Button
            variant={liked ? "default" : "outline"}
            size="lg"
            className={`rounded-xl ${liked ? "bg-destructive hover:bg-destructive/90" : ""}`}
            onClick={handleLike}
          >
            <Heart className={`w-5 h-5 ${liked ? "fill-current" : ""}`} />
          </Button>
          <Button
            variant={saved ? "default" : "outline"}
            size="lg"
            className="rounded-xl"
            onClick={async () => {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) {
                navigate("/auth");
                return;
              }
              if (saved) {
                await supabase
                  .from("saved_books")
                  .delete()
                  .eq("user_id", user.id)
                  .eq("book_id", id);
                setSaved(false);
                toast({ title: "Libro eliminado de guardados" });
              } else {
                await supabase.from("saved_books").insert({
                  user_id: user.id,
                  book_id: id!,
                });
                setSaved(true);
                toast({ title: "¡Libro guardado!" });
              }
            }}
          >
            <Bookmark className={`w-5 h-5 ${saved ? "fill-current" : ""}`} />
          </Button>
          <Button variant="outline" size="lg" className="rounded-xl" onClick={() => setShowShare(true)}>
            <Share2 className="w-5 h-5" />
          </Button>
        </div>

        {/* Description */}
        {book.description && (
          <div>
            <h2 className="font-display font-semibold text-lg mb-2">Sinopsis</h2>
            <p className="text-muted-foreground leading-relaxed">{book.description}</p>
          </div>
        )}

        {/* Tags */}
        {book.tags && book.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {book.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-secondary text-secondary-foreground text-sm rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Chapters */}
        {chapters.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-lg">
                Capítulos ({chapters.length})
              </h2>
            </div>

            <div className="space-y-2">
              {chapters.slice(0, 5).map((chapter, index) => (
                <motion.div
                  key={chapter.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-4 p-3 bg-card rounded-xl hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-medium text-sm">
                    {chapter.chapter_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{chapter.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {chapter.word_count || 0} palabras
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Comments preview */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              Comentarios ({book.comments_count || 0})
            </h2>
          </div>

          {comments.length > 0 ? (
            <div className="space-y-3">
              {comments.map((comment, index) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-card rounded-xl"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-xs font-bold text-primary-foreground">
                      {(comment.profiles?.display_name || comment.profiles?.username)?.[0]?.toUpperCase() || "?"}
                    </div>
                    <span className="font-medium text-sm">
                      {comment.profiles?.display_name || comment.profiles?.username || "Usuario"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{comment.content}</p>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-6">
              No hay comentarios aún. ¡Sé el primero en comentar!
            </p>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {book && (
        <ShareBookAsImage
          isOpen={showShare}
          onClose={() => setShowShare(false)}
          book={{
            title: book.title,
            cover_url: book.cover_url,
            genre: book.genre,
            author: {
              display_name: book.profiles?.display_name || null,
              username: book.profiles?.username || null,
            },
          }}
          stats={{
            reads: book.reads_count || 0,
            likes: book.likes_count || 0,
          }}
        />
      )}
    </div>
  );
};

export default BookDetailPage;
