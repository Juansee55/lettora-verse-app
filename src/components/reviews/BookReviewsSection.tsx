import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, Send, Loader2, Edit3, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Review {
  id: string;
  user_id: string;
  rating: number;
  content: string | null;
  created_at: string;
  profiles: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface BookReviewsSectionProps {
  bookId: string;
}

const StarRating = ({ rating, onRate, size = "md" }: { rating: number; onRate?: (r: number) => void; size?: "sm" | "md" }) => {
  const s = size === "sm" ? "w-4 h-4" : "w-6 h-6";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          onClick={() => onRate?.(i)}
          disabled={!onRate}
          className={`${onRate ? "cursor-pointer active:scale-110" : "cursor-default"} transition-transform`}
        >
          <Star
            className={`${s} ${i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
          />
        </button>
      ))}
    </div>
  );
};

const BookReviewsSection = ({ bookId }: BookReviewsSectionProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [editing, setEditing] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [avgRating, setAvgRating] = useState(0);

  useEffect(() => {
    fetchReviews();
  }, [bookId]);

  const fetchReviews = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    const { data } = await supabase
      .from("book_reviews" as any)
      .select("id, user_id, rating, content, created_at")
      .eq("book_id", bookId)
      .order("created_at", { ascending: false }) as any;

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((r: any) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", userIds as string[]);

      const profileMap: Record<string, any> = {};
      profiles?.forEach((p: any) => { profileMap[p.id] = p; });

      const enriched = data.map((r: any) => ({
        ...r,
        profiles: profileMap[r.user_id] || null,
      }));

      setReviews(enriched);
      const avg = data.reduce((a: number, r: any) => a + r.rating, 0) / data.length;
      setAvgRating(Math.round(avg * 10) / 10);

      if (user) {
        const mine = enriched.find((r: any) => r.user_id === user.id);
        if (mine) {
          setMyReview(mine);
          setRating(mine.rating);
          setContent(mine.content || "");
        }
      }
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) { toast.error("Selecciona una puntuación"); return; }
    if (!currentUserId) { toast.error("Inicia sesión"); return; }

    setSending(true);
    if (myReview) {
      await (supabase.from("book_reviews" as any).update({
        rating, content: content.trim() || null,
      } as any).eq("id", myReview.id) as any);
      toast.success("Reseña actualizada");
    } else {
      await (supabase.from("book_reviews" as any).insert({
        book_id: bookId, user_id: currentUserId,
        rating, content: content.trim() || null,
      } as any) as any);
      toast.success("¡Reseña publicada!");
    }
    setEditing(false);
    setSending(false);
    fetchReviews();
  };

  const handleDelete = async () => {
    if (!myReview) return;
    await (supabase.from("book_reviews" as any).delete().eq("id", myReview.id) as any);
    setMyReview(null);
    setRating(0);
    setContent("");
    toast.success("Reseña eliminada");
    fetchReviews();
  };

  const timeAgo = (date: string) => {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (s < 60) return "ahora";
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
  };

  return (
    <div className="px-5 mb-4">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
          Reseñas · {reviews.length}
        </h3>
        {reviews.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span className="text-[15px] font-bold">{avgRating}</span>
          </div>
        )}
      </div>

      {/* Write / Edit review */}
      {currentUserId && (!myReview || editing) && (
        <div className="ios-section p-4 mb-3">
          <p className="text-[13px] font-medium text-muted-foreground mb-2">
            {myReview ? "Editar tu reseña" : "Escribe una reseña"}
          </p>
          <StarRating rating={rating} onRate={setRating} />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 250))}
            placeholder="Escribe tu opinión (opcional, máx 250 caracteres)"
            className="w-full mt-3 bg-muted/40 rounded-xl px-3 py-2 text-[14px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
            rows={3}
            maxLength={250}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-muted-foreground">{content.length}/250</span>
            <div className="flex gap-2">
              {editing && (
                <button onClick={() => setEditing(false)} className="text-[13px] text-muted-foreground px-3 py-1.5">
                  Cancelar
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={rating === 0 || sending}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground text-[13px] font-semibold rounded-full disabled:opacity-50"
              >
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {myReview ? "Actualizar" : "Publicar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* My review (if exists and not editing) */}
      {myReview && !editing && (
        <div className="ios-section p-4 mb-3 ring-1 ring-primary/20">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[13px] font-semibold text-primary">Tu reseña</span>
              <StarRating rating={myReview.rating} size="sm" />
            </div>
            <div className="flex gap-1">
              <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-muted/50">
                <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button onClick={handleDelete} className="p-1.5 rounded-lg hover:bg-destructive/10">
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </button>
            </div>
          </div>
          {myReview.content && (
            <p className="text-[14px] leading-snug mt-1">{myReview.content}</p>
          )}
        </div>
      )}

      {/* Other reviews */}
      {reviews.filter(r => r.user_id !== currentUserId).length > 0 ? (
        <div className="space-y-2">
          {reviews.filter(r => r.user_id !== currentUserId).map((review, i) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="ios-section p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0 overflow-hidden">
                  {review.profiles?.avatar_url ? (
                    <img src={review.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (review.profiles?.display_name || "?")?.[0]?.toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-[14px]">
                      {review.profiles?.display_name || review.profiles?.username || "Usuario"}
                    </span>
                    <span className="text-[12px] text-muted-foreground">{timeAgo(review.created_at)}</span>
                  </div>
                  <StarRating rating={review.rating} size="sm" />
                  {review.content && (
                    <p className="text-[14px] leading-snug mt-1.5 text-foreground/90">{review.content}</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : reviews.length === 0 && (
        <div className="ios-section p-8 flex flex-col items-center text-center">
          <Star className="w-10 h-10 text-muted-foreground/30 mb-2" />
          <p className="text-[15px] font-medium text-muted-foreground">Sin reseñas</p>
          <p className="text-[13px] text-muted-foreground/60">¡Sé el primero en dejar una reseña!</p>
        </div>
      )}
    </div>
  );
};

export default BookReviewsSection;
