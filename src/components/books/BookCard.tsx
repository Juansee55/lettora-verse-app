import { motion } from "framer-motion";
import { Heart, Eye, Library, BookOpen, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Book {
  id: string;
  title: string;
  author: string;
  cover: string;
  reads: number;
  likes: number;
  category: string;
  isSaga?: boolean;
  topPosition?: number | null;
}

interface BookCardProps {
  book: Book;
  variant?: "default" | "featured" | "compact";
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

const BookCard = ({ book, variant = "default" }: BookCardProps) => {
  const navigate = useNavigate();

  if (variant === "featured") {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate(`/book/${book.id}`)}
        className="relative w-72 h-52 rounded-2xl overflow-hidden cursor-pointer group"
      >
        <img
          src={book.cover}
          alt={book.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        
        <div className="absolute top-3 right-3 flex gap-1.5">
          {book.isSaga && (
            <span className="px-2 py-1 bg-primary/90 text-primary-foreground text-[10px] font-bold rounded-full flex items-center gap-1 backdrop-blur-sm">
              <Library className="w-3 h-3" />
              Saga
            </span>
          )}
          <span className="px-2 py-1 bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium rounded-full">
            {book.category}
          </span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-[17px] font-bold text-white line-clamp-1 mb-0.5">
            {book.title}
          </h3>
          <p className="text-[13px] text-white/70 mb-2">{book.author}</p>
          
          <div className="flex items-center gap-3 text-white/80 text-[12px]">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {formatNumber(book.reads)}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" />
              {formatNumber(book.likes)}
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  if (variant === "compact") {
    return (
      <motion.div
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate(`/book/${book.id}`)}
        className="flex items-center gap-3 p-2.5 bg-card rounded-xl cursor-pointer active:bg-muted/50 transition-colors"
      >
        <div className="relative w-11 h-[60px] rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
          <img src={book.cover} alt={book.title} className="w-full h-full object-cover" loading="lazy" />
          {book.isSaga && (
            <div className="absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-primary rounded-full flex items-center justify-center">
              <Library className="w-2 h-2 text-primary-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold line-clamp-1">{book.title}</h3>
          <p className="text-[12px] text-muted-foreground line-clamp-1">{book.author}</p>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Heart className="w-3 h-3" /> {formatNumber(book.likes)}
            </span>
            <span className="flex items-center gap-0.5">
              <Eye className="w-3 h-3" /> {formatNumber(book.reads)}
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  // Default variant - improved
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(`/book/${book.id}`)}
      className="cursor-pointer group"
    >
      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden mb-2.5 shadow-md ring-1 ring-black/5 dark:ring-white/5">
        <img
          src={book.cover}
          alt={book.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Gradient overlay - always visible but subtle */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Top badges */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
          <div className="flex flex-col gap-1">
            {book.topPosition && book.topPosition <= 100 && (
              <span className="px-1.5 py-0.5 bg-amber-500/90 text-white text-[9px] font-bold rounded-md flex items-center gap-0.5 backdrop-blur-sm w-fit">
                <Trophy className="w-2.5 h-2.5" />
                TOP #{book.topPosition}
              </span>
            )}
            {book.isSaga && (
              <span className="px-1.5 py-0.5 bg-primary/90 text-primary-foreground text-[9px] font-bold rounded-md flex items-center gap-0.5 backdrop-blur-sm w-fit">
                <Library className="w-2.5 h-2.5" />
                Saga
              </span>
            )}
          </div>
          <motion.button 
            whileTap={{ scale: 0.85 }}
            className="w-7 h-7 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <Heart className="w-3.5 h-3.5 text-white" />
          </motion.button>
        </div>

        {/* Bottom info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5">
          <div className="flex items-center gap-3 text-white/90 text-[11px]">
            <span className="flex items-center gap-0.5">
              <Eye className="w-3 h-3" />
              {formatNumber(book.reads)}
            </span>
            <span className="flex items-center gap-0.5">
              <Heart className="w-3 h-3" />
              {formatNumber(book.likes)}
            </span>
          </div>
        </div>
      </div>

      <h3 className="font-semibold text-[14px] line-clamp-1 group-hover:text-primary transition-colors">
        {book.title}
      </h3>
      <p className="text-[12px] text-muted-foreground line-clamp-1 mt-0.5">{book.author}</p>
      {book.category && (
        <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground font-medium">
          {book.category}
        </span>
      )}
    </motion.div>
  );
};

export default BookCard;
