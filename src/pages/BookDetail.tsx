import { useState } from "react";
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
  Star,
  ChevronRight,
  Play,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const bookData = {
  id: "1",
  title: "El Último Amanecer",
  author: "María García",
  authorAvatar: "M",
  cover: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop",
  description:
    "Una historia de amor y redención que te llevará a través de los paisajes más hermosos de la Toscana. Cuando Elena descubre una carta olvidada en un viejo libro, su vida cambia para siempre...",
  reads: 12500,
  likes: 3420,
  comments: 856,
  chapters: 24,
  status: "Completado",
  rating: 4.8,
  category: "Romance",
  tags: ["Amor", "Drama", "Italia", "Segundas oportunidades"],
};

const chapters = [
  { id: 1, title: "El comienzo", reads: 12500 },
  { id: 2, title: "La carta", reads: 11800 },
  { id: 3, title: "Un viaje inesperado", reads: 10500 },
  { id: 4, title: "Toscana", reads: 9800 },
  { id: 5, title: "El encuentro", reads: 9200 },
];

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

const BookDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative h-[50vh] min-h-[400px]">
        <img
          src={bookData.cover}
          alt={bookData.title}
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
            {bookData.category}
          </span>
          <h1 className="text-3xl font-display font-bold mb-2">{bookData.title}</h1>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-sm font-bold text-primary-foreground">
              {bookData.authorAvatar}
            </div>
            <span className="font-medium">{bookData.author}</span>
            <Button variant="outline" size="sm" className="rounded-full h-7 text-xs">
              Seguir
            </Button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {formatNumber(bookData.reads)}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              {formatNumber(bookData.likes)}
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              {bookData.rating}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {bookData.chapters} cap.
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
            onClick={() => setLiked(!liked)}
          >
            <Heart className={`w-5 h-5 ${liked ? "fill-current" : ""}`} />
          </Button>
          <Button
            variant={saved ? "default" : "outline"}
            size="lg"
            className="rounded-xl"
            onClick={() => setSaved(!saved)}
          >
            <Bookmark className={`w-5 h-5 ${saved ? "fill-current" : ""}`} />
          </Button>
          <Button variant="outline" size="lg" className="rounded-xl">
            <Share2 className="w-5 h-5" />
          </Button>
        </div>

        {/* Description */}
        <div>
          <h2 className="font-display font-semibold text-lg mb-2">Sinopsis</h2>
          <p className="text-muted-foreground leading-relaxed">{bookData.description}</p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {bookData.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 bg-secondary text-secondary-foreground text-sm rounded-full"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Chapters */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg">
              Capítulos ({bookData.chapters})
            </h2>
            <Button variant="ghost" size="sm" className="text-primary">
              Ver todos
            </Button>
          </div>

          <div className="space-y-2">
            {chapters.map((chapter, index) => (
              <motion.div
                key={chapter.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-4 p-3 bg-card rounded-xl hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-medium text-sm">
                  {chapter.id}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{chapter.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(chapter.reads)} lecturas
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Comments preview */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              Comentarios ({bookData.comments})
            </h2>
            <Button variant="ghost" size="sm" className="text-primary">
              Ver todos
            </Button>
          </div>

          <div className="space-y-3">
            {[
              { user: "Elena V.", comment: "¡Una historia increíble! No pude parar de leer.", time: "2h" },
              { user: "Juan P.", comment: "El final me dejó sin palabras. Muy recomendado.", time: "5h" },
            ].map((comment, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 bg-card rounded-xl"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-xs font-bold text-primary-foreground">
                    {comment.user[0]}
                  </div>
                  <span className="font-medium text-sm">{comment.user}</span>
                  <span className="text-xs text-muted-foreground">{comment.time}</span>
                </div>
                <p className="text-sm text-muted-foreground">{comment.comment}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetailPage;
