import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Heart,
  ChevronLeft,
  ChevronRight,
  Settings,
  Sun,
  Moon,
  Type,
  Loader2,
  MessageCircle,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";

interface ChapterData {
  id: string;
  title: string;
  content: string | null;
  chapter_number: number;
  word_count: number | null;
  likes_count: number | null;
  book_id: string;
  books: {
    id: string;
    title: string;
    author_id: string;
  } | null;
}

const ChapterReaderPage = () => {
  const { bookId, chapterNumber } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [chapter, setChapter] = useState<ChapterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [totalChapters, setTotalChapters] = useState(0);
  const [fontSize, setFontSize] = useState(16);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    const fetchChapter = async () => {
      if (!bookId || !chapterNumber) return;

      const { data: chapterData, error } = await supabase
        .from("chapters")
        .select(`
          id,
          title,
          content,
          chapter_number,
          word_count,
          likes_count,
          book_id,
          books:book_id (
            id,
            title,
            author_id
          )
        `)
        .eq("book_id", bookId)
        .eq("chapter_number", parseInt(chapterNumber))
        .eq("is_published", true)
        .single();

      if (error || !chapterData) {
        navigate(`/book/${bookId}`);
        return;
      }

      setChapter(chapterData as unknown as ChapterData);
      setLikesCount(chapterData.likes_count || 0);

      // Get total chapters
      const { count } = await supabase
        .from("chapters")
        .select("*", { count: "exact", head: true })
        .eq("book_id", bookId)
        .eq("is_published", true);

      setTotalChapters(count || 0);

      // Check if liked
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: likeData } = await supabase
          .from("chapter_likes")
          .select("id")
          .eq("user_id", user.id)
          .eq("chapter_id", chapterData.id)
          .maybeSingle();

        setLiked(!!likeData);

        // Update reading progress - use upsert pattern
        const { data: existingProgress } = await supabase
          .from("reading_progress")
          .select("id")
          .eq("user_id", user.id)
          .eq("book_id", bookId)
          .maybeSingle();

        if (existingProgress) {
          await supabase
            .from("reading_progress")
            .update({
              current_chapter: parseInt(chapterNumber),
              progress_percent: Math.round((parseInt(chapterNumber) / (count || 1)) * 100),
            })
            .eq("id", existingProgress.id);
        } else {
          await supabase.from("reading_progress").insert({
            user_id: user.id,
            book_id: bookId,
            current_chapter: parseInt(chapterNumber),
            progress_percent: Math.round((parseInt(chapterNumber) / (count || 1)) * 100),
          });
        }
      }

      setLoading(false);
    };

    fetchChapter();
  }, [bookId, chapterNumber, navigate]);

  const handleLike = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!chapter) return;

    if (liked) {
      await supabase
        .from("chapter_likes")
        .delete()
        .eq("user_id", user.id)
        .eq("chapter_id", chapter.id);
      setLiked(false);
      setLikesCount((c) => c - 1);
    } else {
      await supabase.from("chapter_likes").insert({
        user_id: user.id,
        chapter_id: chapter.id,
      });
      setLiked(true);
      setLikesCount((c) => c + 1);

      // Create notification for author
      if (chapter.books?.author_id && chapter.books.author_id !== user.id) {
        await supabase.from("notifications").insert({
          user_id: chapter.books.author_id,
          type: "chapter_like",
          title: "Nuevo like en tu capítulo",
          message: `A alguien le gustó "${chapter.title}"`,
          link: `/book/${bookId}/chapter/${chapterNumber}`,
        });
      }
    }
  };

  const goToChapter = (num: number) => {
    if (num >= 1 && num <= totalChapters) {
      navigate(`/book/${bookId}/chapter/${num}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!chapter) return null;

  const currentNum = parseInt(chapterNumber || "1");

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-background text-foreground' : 'bg-white text-gray-900'}`}>
      {/* Header */}
      <AnimatePresence>
        {showControls && (
          <motion.header
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border"
          >
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(`/book/${bookId}`)}
                  className="rounded-xl"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="min-w-0">
                  <h1 className="font-display font-semibold truncate text-sm">
                    {chapter.books?.title}
                  </h1>
                  <p className="text-xs text-muted-foreground truncate">
                    Capítulo {currentNum} de {totalChapters}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-xl">
                      <Settings className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Configuración de lectura</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-6 mt-6">
                      <div>
                        <label className="text-sm font-medium flex items-center gap-2 mb-3">
                          <Type className="w-4 h-4" />
                          Tamaño de fuente
                        </label>
                        <Slider
                          value={[fontSize]}
                          onValueChange={(v) => setFontSize(v[0])}
                          min={12}
                          max={24}
                          step={1}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {fontSize}px
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-3 block">Tema</label>
                        <div className="flex gap-2">
                          <Button
                            variant={!isDarkMode ? "default" : "outline"}
                            size="sm"
                            onClick={() => setIsDarkMode(false)}
                            className="flex-1"
                          >
                            <Sun className="w-4 h-4 mr-2" />
                            Claro
                          </Button>
                          <Button
                            variant={isDarkMode ? "default" : "outline"}
                            size="sm"
                            onClick={() => setIsDarkMode(true)}
                            className="flex-1"
                          >
                            <Moon className="w-4 h-4 mr-2" />
                            Oscuro
                          </Button>
                        </div>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Content */}
      <main
        className="container mx-auto px-4 py-24 max-w-2xl"
        onClick={() => setShowControls(!showControls)}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-2xl font-display font-bold mb-6">
            {chapter.title}
          </h2>
          
          <div
            className="prose prose-invert max-w-none leading-relaxed"
            style={{ fontSize: `${fontSize}px` }}
            dangerouslySetInnerHTML={{ __html: chapter.content?.replace(/\n/g, '<br>') || '' }}
          />
        </motion.div>

        {/* Chapter end actions */}
        <div className="mt-12 py-8 border-t border-border">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Button
              variant={liked ? "default" : "outline"}
              size="lg"
              className={`rounded-xl ${liked ? "bg-destructive hover:bg-destructive/90" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                handleLike();
              }}
            >
              <Heart className={`w-5 h-5 mr-2 ${liked ? "fill-current" : ""}`} />
              {likesCount}
            </Button>
            <Button variant="outline" size="lg" className="rounded-xl">
              <MessageCircle className="w-5 h-5 mr-2" />
              Comentar
            </Button>
            <Button variant="outline" size="lg" className="rounded-xl">
              <Share2 className="w-5 h-5" />
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground mb-4">
            {chapter.word_count || 0} palabras
          </p>
        </div>
      </main>

      {/* Bottom navigation */}
      <AnimatePresence>
        {showControls && (
          <motion.footer
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border"
          >
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
              <Button
                variant="ghost"
                disabled={currentNum <= 1}
                onClick={() => goToChapter(currentNum - 1)}
                className="rounded-xl"
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                Anterior
              </Button>

              <span className="text-sm text-muted-foreground">
                {currentNum} / {totalChapters}
              </span>

              <Button
                variant="ghost"
                disabled={currentNum >= totalChapters}
                onClick={() => goToChapter(currentNum + 1)}
                className="rounded-xl"
              >
                Siguiente
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChapterReaderPage;
