import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  MoreHorizontal,
  Loader2,
  Users,
  Star,
  BookOpen,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ShareBookAsImage from "@/components/share/ShareBookAsImage";
import BookCollaboratorsModal from "@/components/books/BookCollaboratorsModal";

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
    avatar_url: string | null;
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
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [showAllChapters, setShowAllChapters] = useState(false);
  const [expandedDescription, setExpandedDescription] = useState(false);

  useEffect(() => {
    const fetchBook = async () => {
      if (!id) return;

      const { data: bookData, error } = await supabase
        .from("books")
        .select(`
          id, title, description, cover_url, genre, reads_count, likes_count,
          comments_count, status, tags, author_id,
          profiles:author_id (id, display_name, username, avatar_url)
        `)
        .eq("id", id)
        .single();

      if (error || !bookData) {
        navigate("/home");
        return;
      }

      setBook(bookData as unknown as BookData);

      const { data: chaptersData } = await supabase
        .from("chapters")
        .select("id, title, chapter_number, word_count")
        .eq("book_id", id)
        .eq("is_published", true)
        .order("chapter_number", { ascending: true });

      if (chaptersData) setChapters(chaptersData);

      const { data: commentsData } = await supabase
        .from("comments")
        .select(`
          id, content, created_at,
          profiles:user_id (display_name, username, avatar_url)
        `)
        .eq("commentable_id", id)
        .eq("commentable_type", "book")
        .order("created_at", { ascending: false })
        .limit(10);

      if (commentsData) setComments(commentsData as unknown as Comment[]);

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
        setIsAuthor(user.id === bookData.author_id);
      }

      setLoading(false);
    };

    fetchBook();
  }, [id, navigate]);

  const handleLike = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    if (liked) {
      await supabase.from("likes").delete()
        .eq("user_id", user.id).eq("likeable_id", id).eq("likeable_type", "book");
      setLiked(false);
    } else {
      await supabase.from("likes").insert({ user_id: user.id, likeable_id: id!, likeable_type: "book" });
      setLiked(true);
    }
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    if (saved) {
      await supabase.from("saved_books").delete().eq("user_id", user.id).eq("book_id", id);
      setSaved(false);
      toast({ title: "Eliminado de guardados" });
    } else {
      await supabase.from("saved_books").insert({ user_id: user.id, book_id: id! });
      setSaved(true);
      toast({ title: "¡Libro guardado!" });
    }
  };

  const handleFollow = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
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

  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    setSendingComment(true);
    const { data, error } = await supabase.from("comments").insert({
      user_id: user.id,
      commentable_id: id!,
      commentable_type: "book",
      content: newComment.trim(),
    }).select(`id, content, created_at, profiles:user_id (display_name, username, avatar_url)`).single();

    if (!error && data) {
      setComments(prev => [data as unknown as Comment, ...prev]);
      setNewComment("");
    }
    setSendingComment(false);
  };

  const timeAgo = (date: string | null) => {
    if (!date) return "";
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "ahora";
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

  const displayedChapters = showAllChapters ? chapters : chapters.slice(0, 5);
  const totalWords = chapters.reduce((acc, ch) => acc + (ch.word_count || 0), 0);

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* iOS Sticky Header */}
      <div className="ios-header">
        <div className="flex items-center justify-between px-4 h-11">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-primary active:opacity-60">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-[17px]">Atrás</span>
          </button>
          <button className="text-primary active:opacity-60" onClick={() => setShowShare(true)}>
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Book Cover & Info - App Store Style */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-5 pt-4 pb-2"
      >
        <div className="flex gap-5">
          {/* Cover */}
          <div className="relative flex-shrink-0">
            <div className="w-[130px] h-[195px] rounded-2xl overflow-hidden shadow-lg">
              <img
                src={book.cover_url || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop"}
                alt={book.title}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Status badge */}
            {book.status === "completed" && (
              <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                Completo
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
            <div>
              <h1 className="text-[22px] font-bold leading-tight mb-1 font-display">
                {book.title}
              </h1>
              <p className="text-[15px] text-primary font-medium mb-1">
                {book.profiles?.display_name || book.profiles?.username || "Anónimo"}
              </p>
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-[13px] text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full">
                  {book.genre || "General"}
                </span>
              </div>
            </div>

            {/* Quick Stats - iOS style */}
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <div className="text-[15px] font-bold text-foreground">{formatNumber(book.reads_count || 0)}</div>
                <div className="text-[11px] text-muted-foreground">Lecturas</div>
              </div>
              <div className="text-center border-x border-border">
                <div className="text-[15px] font-bold text-foreground">{formatNumber(book.likes_count || 0)}</div>
                <div className="text-[11px] text-muted-foreground">Me gusta</div>
              </div>
              <div className="text-center">
                <div className="text-[15px] font-bold text-foreground">{chapters.length}</div>
                <div className="text-[11px] text-muted-foreground">Capítulos</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* CTA Button */}
      <div className="px-5 py-3">
        <button
          onClick={() => navigate(`/book/${id}/chapter/1`)}
          disabled={chapters.length === 0}
          className="w-full h-[50px] bg-primary text-primary-foreground rounded-2xl font-semibold text-[17px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          <Play className="w-5 h-5 fill-current" />
          Empezar a leer
        </button>
      </div>

      {/* Action Bar - iOS style */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-around py-2 ios-section">
          <button
            onClick={handleLike}
            className="flex flex-col items-center gap-1 py-2 px-4 active:scale-95 transition-transform"
          >
            <Heart className={`w-[22px] h-[22px] ${liked ? "fill-destructive text-destructive" : "text-primary"}`} />
            <span className={`text-[11px] font-medium ${liked ? "text-destructive" : "text-primary"}`}>
              {liked ? "Te gusta" : "Me gusta"}
            </span>
          </button>
          <button
            onClick={handleSave}
            className="flex flex-col items-center gap-1 py-2 px-4 active:scale-95 transition-transform"
          >
            <Bookmark className={`w-[22px] h-[22px] ${saved ? "fill-primary text-primary" : "text-primary"}`} />
            <span className="text-[11px] font-medium text-primary">
              {saved ? "Guardado" : "Guardar"}
            </span>
          </button>
          <button
            onClick={() => setShowShare(true)}
            className="flex flex-col items-center gap-1 py-2 px-4 active:scale-95 transition-transform"
          >
            <Share2 className="w-[22px] h-[22px] text-primary" />
            <span className="text-[11px] font-medium text-primary">Compartir</span>
          </button>
          {isAuthor && (
            <button
              onClick={() => setShowCollaborators(true)}
              className="flex flex-col items-center gap-1 py-2 px-4 active:scale-95 transition-transform"
            >
              <Users className="w-[22px] h-[22px] text-primary" />
              <span className="text-[11px] font-medium text-primary">Colaborar</span>
            </button>
          )}
        </div>
      </div>

      {/* Author Section */}
      <div className="px-5 mb-4">
        <div
          onClick={() => navigate(`/user/${book.profiles?.id}`)}
          className="ios-section p-4 flex items-center gap-3 cursor-pointer active:bg-muted/50 transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold overflow-hidden">
            {book.profiles?.avatar_url ? (
              <img src={book.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg">{book.profiles?.display_name?.[0]?.toUpperCase() || "?"}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[15px]">
              {book.profiles?.display_name || book.profiles?.username || "Anónimo"}
            </div>
            <div className="text-[13px] text-muted-foreground">
              @{book.profiles?.username || "usuario"}
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleFollow(); }}
            className="px-4 py-1.5 bg-primary text-primary-foreground text-[13px] font-semibold rounded-full active:scale-95 transition-transform"
          >
            Seguir
          </button>
        </div>
      </div>

      {/* Description */}
      {book.description && (
        <div className="px-5 mb-4">
          <div className="ios-section p-4">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Sinopsis
            </h3>
            <p className={`text-[15px] leading-relaxed text-foreground ${!expandedDescription ? "line-clamp-4" : ""}`}>
              {book.description}
            </p>
            {book.description.length > 200 && (
              <button
                onClick={() => setExpandedDescription(!expandedDescription)}
                className="text-primary text-[13px] font-medium mt-1"
              >
                {expandedDescription ? "Menos" : "Más"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tags */}
      {book.tags && book.tags.length > 0 && (
        <div className="px-5 mb-4">
          <div className="flex flex-wrap gap-2">
            {book.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1.5 bg-secondary text-secondary-foreground text-[13px] rounded-full font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Book Info Summary */}
      <div className="px-5 mb-4">
        <div className="ios-section">
          <div className="ios-item">
            <BookOpen className="w-5 h-5 text-primary" />
            <span className="flex-1 text-[15px]">Capítulos</span>
            <span className="text-[15px] text-muted-foreground">{chapters.length}</span>
          </div>
          <div className="ios-item">
            <Clock className="w-5 h-5 text-primary" />
            <span className="flex-1 text-[15px]">Palabras totales</span>
            <span className="text-[15px] text-muted-foreground">{formatNumber(totalWords)}</span>
          </div>
          <div className="ios-item">
            <Star className="w-5 h-5 text-primary" />
            <span className="flex-1 text-[15px]">Estado</span>
            <span className="text-[15px] text-muted-foreground capitalize">
              {book.status === "published" ? "En progreso" : book.status === "completed" ? "Completo" : book.status || "Borrador"}
            </span>
          </div>
        </div>
      </div>

      {/* Chapters List */}
      {chapters.length > 0 && (
        <div className="px-5 mb-4">
          <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1">
            Capítulos
          </h3>
          <div className="ios-section">
            {displayedChapters.map((chapter, index) => (
              <motion.button
                key={chapter.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => navigate(`/book/${id}/chapter/${chapter.chapter_number}`)}
                className="ios-item w-full text-left"
              >
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-semibold text-[13px]">
                  {chapter.chapter_number}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-medium truncate">{chapter.title}</div>
                  <div className="text-[12px] text-muted-foreground">
                    {formatNumber(chapter.word_count || 0)} palabras
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
              </motion.button>
            ))}
            {chapters.length > 5 && (
              <button
                onClick={() => setShowAllChapters(!showAllChapters)}
                className="w-full py-3 text-center text-primary text-[15px] font-medium active:bg-muted/50 transition-colors"
              >
                {showAllChapters ? "Mostrar menos" : `Ver los ${chapters.length} capítulos`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Comments Section */}
      <div className="px-5 mb-4">
        <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1">
          Comentarios · {book.comments_count || comments.length}
        </h3>

        {/* Comment Input */}
        <div className="ios-section mb-3">
          <div className="flex items-center gap-3 p-3">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Escribe un comentario..."
              className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/50"
              onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
            />
            <button
              onClick={handleSendComment}
              disabled={!newComment.trim() || sendingComment}
              className="text-primary disabled:opacity-30 active:scale-90 transition-transform"
            >
              {sendingComment ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Comments List */}
        {comments.length > 0 ? (
          <div className="space-y-3">
            {comments.map((comment, index) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="ios-section p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0 overflow-hidden">
                    {comment.profiles?.avatar_url ? (
                      <img src={comment.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (comment.profiles?.display_name || comment.profiles?.username)?.[0]?.toUpperCase() || "?"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-[14px]">
                        {comment.profiles?.display_name || comment.profiles?.username || "Usuario"}
                      </span>
                      <span className="text-[12px] text-muted-foreground">
                        {timeAgo(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-[14px] leading-snug text-foreground/90">{comment.content}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="ios-section p-8 flex flex-col items-center text-center">
            <MessageCircle className="w-10 h-10 text-muted-foreground/30 mb-2" />
            <p className="text-[15px] font-medium text-muted-foreground">Sin comentarios</p>
            <p className="text-[13px] text-muted-foreground/60">¡Sé el primero en comentar!</p>
          </div>
        )}
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

      {/* Collaborators Modal */}
      {book && isAuthor && (
        <BookCollaboratorsModal
          isOpen={showCollaborators}
          onClose={() => setShowCollaborators(false)}
          bookId={book.id}
          bookTitle={book.title}
        />
      )}
    </div>
  );
};

export default BookDetailPage;
