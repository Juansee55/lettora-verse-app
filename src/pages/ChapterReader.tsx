import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import {
  ArrowLeft,
  Heart,
  ChevronLeft,
  ChevronRight,
  Settings,
  Loader2,
  MessageCircle,
  Share2,
  BookmarkPlus,
  Download,
  Check,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useReadingSettings } from "@/hooks/useReadingSettings";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { ReadingSettingsSheet } from "@/components/reader/ReadingSettingsSheet";
import { PageTransition } from "@/components/reader/PageTransition";

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
  const contentRef = useRef<HTMLDivElement>(null);
  
  const { settings, updateSetting, resetSettings, getThemeStyles, getFontFamily, getMarginClass } = useReadingSettings();
  const { isOnline, getOfflineBook, isBookDownloaded, saveBookOffline } = useOfflineStorage();
  
  const [chapter, setChapter] = useState<ChapterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [totalChapters, setTotalChapters] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [downloading, setDownloading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  
  // Swipe gesture
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);
  const scale = useTransform(x, [-200, 0, 200], [0.95, 1, 0.95]);

  const themeStyles = getThemeStyles();
  const currentNum = parseInt(chapterNumber || "1");

  // Scroll progress tracking
  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
        const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
        setScrollProgress(Math.min(100, Math.max(0, progress)));
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keep screen on
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    
    const requestWakeLock = async () => {
      if (settings.keepScreenOn && 'wakeLock' in navigator) {
        try {
          wakeLock = await navigator.wakeLock.request('screen');
        } catch (err) {
          console.log('Wake Lock not supported');
        }
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }, [settings.keepScreenOn]);

  // Fetch chapter data
  useEffect(() => {
    const fetchChapter = async () => {
      if (!bookId || !chapterNumber) return;

      // Try offline first if not online
      if (!isOnline) {
        const offlineBook = await getOfflineBook(bookId);
        if (offlineBook) {
          const offlineChapter = offlineBook.chapters.find(
            c => c.chapterNumber === parseInt(chapterNumber)
          );
          if (offlineChapter) {
            setChapter({
              id: offlineChapter.id,
              title: offlineChapter.title,
              content: offlineChapter.content,
              chapter_number: offlineChapter.chapterNumber,
              word_count: offlineChapter.wordCount,
              likes_count: 0,
              book_id: bookId,
              books: {
                id: bookId,
                title: offlineBook.title,
                author_id: '',
              },
            });
            setTotalChapters(offlineBook.chapters.length);
            setLoading(false);
            return;
          }
        }
        toast({
          title: "Sin conexión",
          description: "Este libro no está disponible offline.",
          variant: "destructive",
        });
        return;
      }

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
      setIsDownloaded(isBookDownloaded(bookId));

      // Get total chapters
      const { count } = await supabase
        .from("chapters")
        .select("*", { count: "exact", head: true })
        .eq("book_id", bookId)
        .eq("is_published", true);

      setTotalChapters(count || 0);

      // Check if liked and update progress
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: likeData } = await supabase
          .from("chapter_likes")
          .select("id")
          .eq("user_id", user.id)
          .eq("chapter_id", chapterData.id)
          .maybeSingle();

        setLiked(!!likeData);

        // Update reading progress
        const { data: existingProgress } = await supabase
          .from("reading_progress")
          .select("id")
          .eq("user_id", user.id)
          .eq("book_id", bookId)
          .maybeSingle();

        const progressData = {
          current_chapter: parseInt(chapterNumber),
          progress_percent: Math.round((parseInt(chapterNumber) / (count || 1)) * 100),
        };

        if (existingProgress) {
          await supabase
            .from("reading_progress")
            .update(progressData)
            .eq("id", existingProgress.id);
        } else {
          await supabase.from("reading_progress").insert({
            user_id: user.id,
            book_id: bookId,
            ...progressData,
          });
        }
      }

      setLoading(false);
    };

    setLoading(true);
    fetchChapter();
  }, [bookId, chapterNumber, navigate, isOnline, getOfflineBook, isBookDownloaded, toast]);

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

  const goToChapter = useCallback((num: number, dir: 'next' | 'prev') => {
    if (num >= 1 && num <= totalChapters) {
      setDirection(dir);
      window.scrollTo(0, 0);
      navigate(`/book/${bookId}/chapter/${num}`);
    }
  }, [bookId, navigate, totalChapters]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;
    if (info.offset.x > threshold && currentNum > 1) {
      goToChapter(currentNum - 1, 'prev');
    } else if (info.offset.x < -threshold && currentNum < totalChapters) {
      goToChapter(currentNum + 1, 'next');
    }
  };

  const handleTap = (e: React.MouseEvent) => {
    if (!settings.tapNavigation) {
      setShowControls(!showControls);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    if (x < width * 0.25) {
      // Left tap - previous
      if (currentNum > 1) goToChapter(currentNum - 1, 'prev');
    } else if (x > width * 0.75) {
      // Right tap - next
      if (currentNum < totalChapters) goToChapter(currentNum + 1, 'next');
    } else {
      // Center tap - toggle controls
      setShowControls(!showControls);
    }
  };

  const downloadBook = async () => {
    if (!bookId || !chapter?.books) return;
    
    setDownloading(true);
    try {
      // Fetch all chapters
      const { data: chapters } = await supabase
        .from("chapters")
        .select("id, title, content, chapter_number, word_count")
        .eq("book_id", bookId)
        .eq("is_published", true)
        .order("chapter_number");

      if (!chapters) throw new Error("No chapters found");

      // Fetch book details
      const { data: book } = await supabase
        .from("books")
        .select("title, cover_url, profiles:author_id(display_name)")
        .eq("id", bookId)
        .single();

      if (!book) throw new Error("Book not found");

      await saveBookOffline({
        id: bookId,
        title: book.title,
        author: (book.profiles as any)?.display_name || 'Autor desconocido',
        coverUrl: book.cover_url,
        downloadedAt: new Date().toISOString(),
        chapters: chapters.map(c => ({
          id: c.id,
          bookId,
          title: c.title,
          content: c.content || '',
          chapterNumber: c.chapter_number,
          wordCount: c.word_count || 0,
        })),
      });

      setIsDownloaded(true);
      toast({
        title: "Libro descargado",
        description: "Ahora puedes leerlo sin conexión.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo descargar el libro.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${themeStyles.bg} flex items-center justify-center`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando capítulo...</p>
        </motion.div>
      </div>
    );
  }

  if (!chapter) return null;

  return (
    <div className={`min-h-screen ${themeStyles.bg} ${themeStyles.text}`}>
      {/* Progress bar */}
      {settings.showProgress && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: showControls ? 1 : 0.3 }}
          className="fixed top-0 left-0 right-0 z-50 h-1"
        >
          <Progress value={scrollProgress} className="h-full rounded-none" />
        </motion.div>
      )}

      {/* Header */}
      <AnimatePresence>
        {showControls && (
          <motion.header
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`fixed top-0 left-0 right-0 z-40 ${themeStyles.bg}/95 backdrop-blur-xl border-b ${themeStyles.accent}`}
          >
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(`/book/${bookId}`)}
                  className="rounded-xl shrink-0"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="min-w-0">
                  <h1 className="font-display font-semibold truncate text-sm">
                    {chapter.books?.title}
                  </h1>
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    {isOnline ? (
                      <Wifi className="w-3 h-3" />
                    ) : (
                      <WifiOff className="w-3 h-3" />
                    )}
                    Capítulo {currentNum} de {totalChapters}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={downloadBook}
                  disabled={downloading || isDownloaded}
                  className="rounded-xl"
                >
                  {downloading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isDownloaded ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSettings(true)}
                  className="rounded-xl"
                >
                  <Settings className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Content */}
      <motion.main
        ref={contentRef}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ x, opacity, scale }}
        className={`container mx-auto py-24 ${getMarginClass()}`}
        onClick={handleTap}
      >
        <PageTransition
          pageKey={`chapter-${chapterNumber}`}
          animation={settings.pageAnimation}
          direction={direction}
        >
          <motion.article
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-3xl font-display font-bold mb-2">
              {chapter.title}
            </h2>
            <p className="text-muted-foreground text-sm mb-8">
              Capítulo {currentNum} • {chapter.word_count || 0} palabras
            </p>
            
            <div
              className="prose max-w-none leading-relaxed"
              style={{
                fontSize: `${settings.fontSize}px`,
                lineHeight: settings.lineHeight,
                fontFamily: getFontFamily(),
                textAlign: settings.textAlign,
              }}
              dangerouslySetInnerHTML={{
                __html: chapter.content?.replace(/\n/g, '<br>') || ''
              }}
            />
          </motion.article>
        </PageTransition>

        {/* Chapter end actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={`mt-16 py-8 border-t ${themeStyles.accent}`}
        >
          <div className="flex items-center justify-center gap-3 mb-8">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant={liked ? "default" : "outline"}
                size="lg"
                className={`rounded-2xl h-14 px-6 ${
                  liked ? "bg-pink-500 hover:bg-pink-600 border-pink-500" : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleLike();
                }}
              >
                <Heart className={`w-5 h-5 mr-2 ${liked ? "fill-current" : ""}`} />
                {likesCount}
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="outline" size="lg" className="rounded-2xl h-14 px-6">
                <MessageCircle className="w-5 h-5 mr-2" />
                Comentar
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="outline" size="icon" className="rounded-2xl h-14 w-14">
                <BookmarkPlus className="w-5 h-5" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="outline" size="icon" className="rounded-2xl h-14 w-14">
                <Share2 className="w-5 h-5" />
              </Button>
            </motion.div>
          </div>

          {/* Next chapter preview */}
          {currentNum < totalChapters && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <p className="text-muted-foreground text-sm mb-4">
                Continúa leyendo
              </p>
              <Button
                variant="hero"
                size="lg"
                className="rounded-2xl"
                onClick={() => goToChapter(currentNum + 1, 'next')}
              >
                Siguiente capítulo
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          )}
        </motion.div>
      </motion.main>

      {/* Bottom navigation */}
      <AnimatePresence>
        {showControls && (
          <motion.footer
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`fixed bottom-0 left-0 right-0 z-40 ${themeStyles.bg}/95 backdrop-blur-xl border-t ${themeStyles.accent}`}
          >
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
              <Button
                variant="ghost"
                disabled={currentNum <= 1}
                onClick={() => goToChapter(currentNum - 1, 'prev')}
                className="rounded-xl"
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                Anterior
              </Button>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{currentNum}</span>
                <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentNum / totalChapters) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  />
                </div>
                <span className="text-sm text-muted-foreground">{totalChapters}</span>
              </div>

              <Button
                variant="ghost"
                disabled={currentNum >= totalChapters}
                onClick={() => goToChapter(currentNum + 1, 'next')}
                className="rounded-xl"
              >
                Siguiente
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>

      {/* Settings Sheet */}
      <ReadingSettingsSheet
        open={showSettings}
        onOpenChange={setShowSettings}
        settings={settings}
        onUpdateSetting={updateSetting}
        onReset={resetSettings}
      />
    </div>
  );
};

export default ChapterReaderPage;
