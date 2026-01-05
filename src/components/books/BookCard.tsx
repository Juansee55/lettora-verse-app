import { motion } from "framer-motion";
import { Heart, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Book {
  id: string;
  title: string;
  author: string;
  cover: string;
  reads: number;
  likes: number;
  category: string;
}

interface BookCardProps {
  book: Book;
  variant?: "default" | "featured";
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
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate(`/book/${book.id}`)}
        className="relative w-72 h-48 rounded-2xl overflow-hidden cursor-pointer group"
      >
        <img
          src={book.cover}
          alt={book.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <span className="inline-block px-2 py-1 bg-primary/80 text-primary-foreground text-xs font-medium rounded-full mb-2">
            {book.category}
          </span>
          <h3 className="text-lg font-display font-semibold text-primary-foreground line-clamp-1">
            {book.title}
          </h3>
          <p className="text-sm text-primary-foreground/70">{book.author}</p>
          
          <div className="flex items-center gap-4 mt-2 text-primary-foreground/80 text-sm">
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {formatNumber(book.reads)}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              {formatNumber(book.likes)}
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/book/${book.id}`)}
      className="cursor-pointer group"
    >
      <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-3 shadow-card">
        <img
          src={book.cover}
          alt={book.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="w-8 h-8 bg-card/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
            <Heart className="w-4 h-4" />
          </button>
        </div>

        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity text-primary-foreground text-xs">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {formatNumber(book.reads)}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3" />
            {formatNumber(book.likes)}
          </span>
        </div>
      </div>

      <h3 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
        {book.title}
      </h3>
      <p className="text-xs text-muted-foreground line-clamp-1">{book.author}</p>
    </motion.div>
  );
};

export default BookCard;
